export const DIETARY_OPTIONS = [
  "No Special Requirements",
  "Vegetarian",
  "Vegan",
  "Pescatarian",
  "Halaal",
  "Kosher",
  "Gluten-Free",
  "Dairy-Free",
  "Nut-Free",
];
export function DietaryNeedsPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const standard = DIETARY_OPTIONS.includes(value);
  const legacyNone = /^none$/i.test(value);
  const other = !!value && !standard && !legacyNone;
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor="dietary">
        Dietary Needs
      </label>
      <select
        id="dietary"
        value={legacyNone ? "None" : other ? "Other" : value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-input bg-transparent px-3 py-2 text-sm"
      >
        <option value="">Please Select</option>
        {legacyNone && <option value="None">None</option>}
        {DIETARY_OPTIONS.map((option) => (
          <option key={option}>{option}</option>
        ))}
        <option value="Other">Other / Allergies Or Multiple Requirements</option>
      </select>
      {other && (
        <label className="block text-sm">
          Please Specify
          <input
            aria-label="Dietary details"
            className="mt-1 w-full border border-input bg-transparent px-3 py-2"
            value={value === "Other" ? "" : value.replace(/^Other: /, "")}
            onChange={(e) => onChange("Other: " + e.target.value)}
          />
        </label>
      )}
    </div>
  );
}
