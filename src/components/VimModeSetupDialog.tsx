import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useVimStore } from "@/store/useVimStore";

export function VimModeSetupDialog() {
  const { hasChosenMode, setHasChosenMode, setEnabled } = useVimStore();

  const handleSelect = (useVim: boolean) => {
    setEnabled(useVim);
    setHasChosenMode(true);
  };

  // We only show the dialog if they haven't chosen yet
  if (hasChosenMode) return null;

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-[425px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Choose Your Editing Mode</DialogTitle>
          <DialogDescription>
            You can use standard controls or enable Vim keybindings. You can change this later in Settings.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-row justify-end space-x-2">
          <Button variant="outline" onClick={() => handleSelect(false)}>
            Standard Mode
          </Button>
          <Button onClick={() => handleSelect(true)}>
            Enable Vim Mode
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
