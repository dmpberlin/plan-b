import { PlanBView } from "@/components/PlanBView";
import appearances from "@/data/schedule.json";
import locations from "@/data/locations.json";
import { Appearance, Location } from "@/types";

export default function PlanBPage() {
  return (
    <PlanBView
      appearances={appearances as Appearance[]}
      locations={locations as Location[]}
    />
  );
}
