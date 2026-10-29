import { Button, ErrorNotice, Sheet } from "../ui";

export function StopSheet({
  sending,
  error,
  onConfirm,
  onCancel,
}: {
  sending: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet
      title="Stop your robot?"
      subtitle="It will halt what it is doing. You can start it again from the console."
      onClose={onCancel}
    >
      <ErrorNotice error={error} />
      <Button primary danger busy={sending} disabled={sending} onPress={onConfirm}>
        Stop now
      </Button>
      <Button onPress={onCancel}>Cancel</Button>
    </Sheet>
  );
}
