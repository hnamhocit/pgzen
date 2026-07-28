use russh::client::{self, Handler};
use std::sync::Arc;
use std::time::Duration;
use tokio::net::TcpListener;
use tokio::sync::Mutex;
use std::collections::HashMap;
use std::sync::OnceLock;

pub struct SshClient {}

impl Handler for SshClient {
    type Error = russh::Error;
    async fn check_server_key(
        &mut self,
        _server_public_key: &russh::keys::PublicKey,
    ) -> Result<bool, Self::Error> {
        Ok(true)
    }
}

// Global store for SSH tunnels (Connection ID -> Local Port)
fn ssh_tunnels() -> &'static Arc<Mutex<HashMap<String, u16>>> {
    static TUNNELS: OnceLock<Arc<Mutex<HashMap<String, u16>>>> = OnceLock::new();
    TUNNELS.get_or_init(|| Arc::new(Mutex::new(HashMap::new())))
}

pub async fn start_ssh_tunnel(
    connection_id: &str,
    ssh_host: &str,
    ssh_port: u16,
    ssh_user: &str,
    ssh_password: &Option<String>,
    db_host: &str,
    db_port: u16,
) -> Result<u16, String> {
    let mut tunnels = ssh_tunnels().lock().await;
    if let Some(&port) = tunnels.get(connection_id) {
        return Ok(port);
    }

    let config = client::Config {
        inactivity_timeout: Some(Duration::from_secs(60)),
        ..Default::default()
    };
    
    let config = Arc::new(config);
    let sh = SshClient {};
    
    let addr = format!("{}:{}", ssh_host, ssh_port);
    let mut session = client::connect(config, addr, sh)
        .await
        .map_err(|e| format!("SSH connect error: {}", e))?;

    let auth_res = if let Some(pass) = ssh_password {
        if pass.is_empty() {
            session.authenticate_none(ssh_user).await
        } else {
            session.authenticate_password(ssh_user, pass).await
        }
    } else {
        session.authenticate_none(ssh_user).await
    };

    let auth_success = auth_res.map_err(|e| format!("SSH Auth error: {}", e))?;
    if !matches!(auth_success, russh::client::AuthResult::Success) {
        return Err("SSH Authentication failed".to_string());
    }

    let session_handle = Arc::new(tokio::sync::Mutex::new(session));

    // Bind local port
    let listener = TcpListener::bind("127.0.0.1:0").await.map_err(|e| format!("Failed to bind local port: {}", e))?;
    let local_port = listener.local_addr().map_err(|e| e.to_string())?.port();

    let db_host = db_host.to_string();

    tokio::spawn(async move {
        while let Ok((mut local_stream, _)) = listener.accept().await {
            let handle = session_handle.clone();
            let host = db_host.clone();
            tokio::spawn(async move {
                let session_lock = handle.lock().await;
                if let Ok(channel) = session_lock.channel_open_direct_tcpip(&host, db_port as u32, "localhost", 0).await {
                    drop(session_lock); // Drop lock so other connections can be established
                    let mut stream = channel.into_stream();
                    let _ = tokio::io::copy_bidirectional(&mut local_stream, &mut stream).await;
                }
            });
        }
    });

    tunnels.insert(connection_id.to_string(), local_port);
    
    Ok(local_port)
}
