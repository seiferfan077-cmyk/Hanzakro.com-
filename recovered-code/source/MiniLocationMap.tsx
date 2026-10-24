import { MapPin, Route } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LocationShare } from "@/lib/locationShare";
import { MapView } from "./Map";

type RouteOrigin = { lat: number; lng: number };

export default function MiniLocationMap({ share, label, routeOrigin }: { share: LocationShare; label: string; routeOrigin?: RouteOrigin | null }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const directionsRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [routeStatus, setRouteStatus] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");

  const placeMarker = useCallback((map: google.maps.Map) => {
    const position = { lat: share.latitude, lng: share.longitude };
    map.setCenter(position);
    if (markerRef.current) markerRef.current.map = null;
    markerRef.current = new google.maps.marker.AdvancedMarkerElement({ map, position, title: label });
  }, [label, share.latitude, share.longitude]);

  const drawRoute = useCallback((map: google.maps.Map) => {
    directionsRef.current?.setMap(null);
    directionsRef.current = null;
    if (!routeOrigin) { setRouteStatus("idle"); return; }
    setRouteStatus("loading");
    const renderer = new google.maps.DirectionsRenderer({ map, suppressMarkers: true, preserveViewport: false, polylineOptions: { strokeColor: "#316047", strokeWeight: 5, strokeOpacity: .84 } });
    directionsRef.current = renderer;
    const service = new google.maps.DirectionsService();
    void service.route({ origin: routeOrigin, destination: { lat: share.latitude, lng: share.longitude }, travelMode: google.maps.TravelMode.DRIVING }).then(result => {
      renderer.setDirections(result);
      setRouteStatus("ready");
    }).catch(() => {
      renderer.setMap(null);
      if (directionsRef.current === renderer) directionsRef.current = null;
      setRouteStatus("unavailable");
    });
  }, [routeOrigin, share.latitude, share.longitude]);

  useEffect(() => {
    if (mapRef.current) placeMarker(mapRef.current);
  }, [placeMarker]);
  useEffect(() => {
    if (mapRef.current) drawRoute(mapRef.current);
  }, [drawRoute]);
  useEffect(() => () => directionsRef.current?.setMap(null), []);

  return <div className="presence-mini-map" aria-label={`خريطة مصغرة لمكان ${label}`}>
    <MapView
      className="presence-mini-map-canvas"
      initialCenter={{ lat: share.latitude, lng: share.longitude }}
      initialZoom={15}
      options={{ disableDefaultUI: true, gestureHandling: "cooperative", clickableIcons: false, mapTypeControl: false, streetViewControl: false }}
      onMapReady={map => { mapRef.current = map; placeMarker(map); drawRoute(map); }}
    />
    <span className="presence-mini-map-caption"><MapPin size={13} />مكان {label}</span>
    {routeStatus === "loading" ? <span className="presence-mini-map-route"><Route size={12} />بنجهز المسار…</span> : null}
    {routeStatus === "ready" ? <span className="presence-mini-map-route is-ready"><Route size={12} />ده مسار الوصول</span> : null}
    {routeStatus === "unavailable" ? <span className="presence-mini-map-route is-unavailable">الخريطة مفتوحة، بس المسار مش متاح دلوقتي.</span> : null}
  </div>;
}
