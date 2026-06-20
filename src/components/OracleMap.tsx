import { useEffect, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import { LingYanLogo } from "./LingYanLogo";
import type { GeoPoint, LingYanResult } from "../lib/types";

type OracleMapProps = {
  userLocation: GeoPoint;
  result: LingYanResult;
};

export function OracleMap({ userLocation, result }: OracleMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (instanceRef.current) {
      instanceRef.current.remove();
      instanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
    }).setView([result.coordinate.lat, result.coordinate.lng], 15);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    const swallowIcon = L.divIcon({
      className: "swallow-marker",
      html: renderToStaticMarkup(
        <div className="swallow-marker__shell">
          <LingYanLogo title="灵燕坐标" />
        </div>,
      ),
      iconSize: [54, 54],
      iconAnchor: [27, 27],
    });

    const userIcon = L.divIcon({
      className: "user-marker",
      html: "<div></div>",
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    L.marker([result.coordinate.lat, result.coordinate.lng], { icon: swallowIcon }).addTo(map);
    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(map);
    L.circle([result.coordinate.lat, result.coordinate.lng], {
      radius: 160,
      color: "#2563eb",
      fillColor: "#60a5fa",
      fillOpacity: 0.14,
      weight: 2,
    }).addTo(map);
    routeRef.current = L.polyline(
      [
        [userLocation.lat, userLocation.lng],
        [result.coordinate.lat, result.coordinate.lng],
      ],
      {
        color: "#b45309",
        weight: 3,
        opacity: 0.78,
        dashArray: "8 10",
      },
    ).addTo(map);
    map.fitBounds(
      L.latLngBounds([
        [userLocation.lat, userLocation.lng],
        [result.coordinate.lat, result.coordinate.lng],
      ]),
      {
        maxZoom: 15,
        padding: [72, 72],
      },
    );
    L.control
      .attribution({
        prefix: "Leaflet · CARTO",
      })
      .addTo(map);

    instanceRef.current = map;
    return () => {
      map.remove();
      instanceRef.current = null;
      userMarkerRef.current = null;
      routeRef.current = null;
    };
  }, [result.id]);

  useEffect(() => {
    const map = instanceRef.current;
    if (!map || !userMarkerRef.current || !routeRef.current) return;
    userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    routeRef.current.setLatLngs([
      [userLocation.lat, userLocation.lng],
      [result.coordinate.lat, result.coordinate.lng],
    ]);
  }, [result.coordinate, userLocation]);

  return <div className="oracle-map" ref={mapRef} aria-label="灵燕坐标地图" />;
}
