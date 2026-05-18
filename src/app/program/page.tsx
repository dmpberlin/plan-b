import { ProgramView } from "@/components/ProgramView";
import appearances from "@/data/schedule.json";
import locations from "@/data/locations.json";
import { Appearance, Location } from "@/types";

export default function ProgramPage() {
  return (
    <ProgramView
      appearances={appearances as Appearance[]}
      locations={locations as Location[]}
    />
  );
}
