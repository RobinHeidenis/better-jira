import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "#/components/ui/combobox";

export type PickerOption = {
  value: string;
  label: string;
  description?: string;
};

/** A searchable single choice that can be cleared back to null. */
export const Picker = ({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  className = "w-72",
  defaultOpen,
}: {
  options: PickerOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  defaultOpen?: boolean;
}) => (
  <Combobox
    defaultOpen={defaultOpen}
    items={options}
    value={options.find((option) => option.value === value) ?? null}
    onValueChange={(option: PickerOption | null) =>
      onChange(option?.value ?? null)
    }
    itemToStringLabel={(option: PickerOption) => option.label}
    isItemEqualToValue={(a: PickerOption, b: PickerOption) =>
      a.value === b.value
    }
  >
    <ComboboxInput
      placeholder={placeholder}
      showClear={value !== null}
      disabled={disabled}
      className={className}
    />
    <ComboboxContent>
      <ComboboxEmpty>No matches</ComboboxEmpty>
      <ComboboxList>
        {(option: PickerOption) => (
          <ComboboxItem key={option.value} value={option}>
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{option.label}</span>
              {option.description ? (
                <span className="truncate text-muted-foreground">
                  {option.description}
                </span>
              ) : null}
            </span>
          </ComboboxItem>
        )}
      </ComboboxList>
    </ComboboxContent>
  </Combobox>
);
