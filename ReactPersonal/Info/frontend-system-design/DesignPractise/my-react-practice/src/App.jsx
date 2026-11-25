import { Dialog } from './components/Dialog/Dialog';

export default function App() {
  return (
    <div style={{ padding: 24 }}>
      <Dialog.Root>
        <Dialog.Trigger>Open Modal</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>Hello from Dialog</Dialog.Title>
          <Dialog.Description>Press Tab or Escape to test keyboard trap.</Dialog.Description>
          <Dialog.Close>Close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}
