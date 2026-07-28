use keyring::Entry;

fn main() {
    let entry = Entry::new("test-service", "test-user").unwrap();
    entry.set_password("mypass").unwrap();
    let pw = entry.get_password().unwrap();
    entry.delete_password().unwrap();
}
