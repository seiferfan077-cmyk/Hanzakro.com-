import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("مسار الوصول للموقع المشترك", () => {
  it("يرسم مساراً من موقع المستلم عند توفره ويُبقي الخريطة صالحة بدونه", async () => {
    const source = await readFile("client/src/components/MiniLocationMap.tsx", "utf8");
    expect(source).toContain("routeOrigin?: RouteOrigin | null");
    expect(source).toContain("if (!routeOrigin) { setRouteStatus(\"idle\"); return; }");
    expect(source).toContain("new google.maps.DirectionsService()");
    expect(source).toContain("travelMode: google.maps.TravelMode.DRIVING");
    expect(source).toContain("ده مسار الوصول");
    expect(source).toContain("الخريطة مفتوحة، بس المسار مش متاح دلوقتي.");
  });

  it("يطلب موقع المستلم فقط بعد ضغطه زر الذهاب للمكان المشترك", async () => {
    const source = await readFile("client/src/components/GeneralFloatingBar.tsx", "utf8");
    expect(source).toContain("const openReceivedLocation = async () =>");
    expect(source).toContain("const location = await requestBrowserLocation()");
    expect(source).toContain("setRouteOrigin({ lat: location.latitude, lng: location.longitude })");
    expect(source).toContain("routeOrigin={locationForMap.sender === member ? null : routeOrigin}");
  });
});
