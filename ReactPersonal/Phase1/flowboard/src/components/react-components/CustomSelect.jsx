import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export default function CustomSelect({ items, title, onChange, value, placeholder }) {
  let renderItems = [
    {
      label: placeholder ? placeholder : `Select a ${title ? title : "option"}`,
      value: null,
    },
    ...items,
  ];
  return (
    <Select items={renderItems} value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full max-w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>{title ? title : "Option"}</SelectLabel>
          {items.map((item) => (
            <SelectItem key={item.id} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
