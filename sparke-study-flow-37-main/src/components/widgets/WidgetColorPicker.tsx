
import { cn } from "@/lib/utils";

interface WidgetColorPickerProps {
  onSelectColor: (color: string) => void;
  onClose?: () => void;
}

const WidgetColorPicker = ({ onSelectColor, onClose }: WidgetColorPickerProps) => {
  const colors = [
    { value: "#F1F0FB", name: "Lavender" },  // Soft purple
    { value: "#F2FCE2", name: "Mint" },      // Soft green
    { value: "#FEF7CD", name: "Lemon" },     // Soft yellow
    { value: "#FFDEE2", name: "Rose" },      // Soft pink
    { value: "#D3E4FD", name: "Sky" },       // Soft blue
    { value: "#FDE1D3", name: "Peach" },     // Soft orange
    { value: "#FFFFFF", name: "White" },     // White
    { value: "#F6F6F7", name: "Light Gray" } // Light gray
  ];

  return (
    <div 
      className="absolute right-0 top-7 bg-white rounded-md shadow-md border border-border z-30 p-3 w-44"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2 text-xs font-medium">Choose a color</div>
      <div className="grid grid-cols-4 gap-2">
        {colors.map((color) => (
          <button
            key={color.value}
            onClick={() => onSelectColor(color.value)}
            className="w-8 h-8 rounded-md border border-border flex items-center justify-center overflow-hidden"
            title={color.name}
          >
            <div
              className="w-full h-full"
              style={{ backgroundColor: color.value }}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default WidgetColorPicker;
