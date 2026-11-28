import { Dialog } from './components/Dialog/Dialog';
import { Select } from './components/Select/Select';
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
      <div style={{ height: 24 }} />
      <Select.Root>
    <Select.Trigger aria-label="Choose an option">
      <Select.Value placeholder="Select an option..." />
    </Select.Trigger>
    <Select.Content>
      <Select.Item value="1">Option 1</Select.Item>
      <Select.Item value="2">Option 2</Select.Item>
      <Select.Item value="3">Option 3</Select.Item>
    </Select.Content>
  </Select.Root>

    </div>
  );
}
