import { useEffect, useState, useRef } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { toast } from "sonner";
import { DownloadSimple } from "@phosphor-icons/react"; // Will use generic Phosphor icons or standard styles

export function AutoUpdater() {
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    const runSilentUpdate = async () => {
      try {
        const update = await check();
        if (update) {
          // Toast indicating we are downloading an update
          const toastId = toast.loading(`Downloading update v${update.version}...`, {
            description: "App will continue to work normally.",
            duration: Infinity,
          });

          await update.downloadAndInstall();
          
          toast.dismiss(toastId);
          toast.success("Update Ready!", {
            description: `Version ${update.version} has been downloaded.`,
            duration: Infinity,
            action: {
              label: "Restart Now",
              onClick: () => {
                relaunch();
              },
            },
          });
        }
      } catch (err) {
        console.error("Auto updater error:", err);
      }
    };

    // Delay the update check slightly so it doesn't block initial render/startup performance
    const timer = setTimeout(() => {
      runSilentUpdate();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
