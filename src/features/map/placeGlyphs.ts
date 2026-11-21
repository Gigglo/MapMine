import { __iconData as briefcase } from "lucide-react-native/icons/briefcase";
import { __iconData as coffee } from "lucide-react-native/icons/coffee";
import { __iconData as dumbbell } from "lucide-react-native/icons/dumbbell";
import { __iconData as graduationCap } from "lucide-react-native/icons/graduation-cap";
import { __iconData as house } from "lucide-react-native/icons/house";
import { __iconData as pin } from "lucide-react-native/icons/map-pin";
import { __iconData as shoppingBag } from "lucide-react-native/icons/shopping-bag";
import { __iconData as utensils } from "lucide-react-native/icons/utensils";

const icons = { Pin: pin, Briefcase: briefcase, Coffee: coffee, Dumbbell: dumbbell, GraduationCap: graduationCap,
  House: house, ShoppingBag: shoppingBag, Utensils: utensils };

export const placeGlyphs = Object.fromEntries(Object.entries(icons).map(([name, icon]) => {
  const nodes = icon.node.map(([tag, props]) => {
    const attributes = Object.entries(props).filter(([key]) => key !== "key")
      .map(([key, value]) => `${key}="${value}"`).join(" ");
    return `<${tag} ${attributes}/>`;
  }).join("");
  const badge = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="13" fill="#1c1c1c" stroke="#f5f5f5"/>
    <g transform="translate(6 6) scale(.667)" fill="none" stroke="#f5f5f5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${nodes}</g>
  </svg>`;
  return [name, "data:image/svg+xml," + encodeURIComponent(badge)];
}));
