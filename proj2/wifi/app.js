import React from 'react';
import {render} from 'react-dom';
import {StaticMap} from 'react-map-gl';
import {AmbientLight, PointLight, LightingEffect} from '@deck.gl/core';
import {IconLayer} from '@deck.gl/layers';
import {HexagonLayer} from '@deck.gl/aggregation-layers';
import DeckGL from '@deck.gl/react';
import {readString} from "react-papaparse";

// Set your mapbox token here
const MAPBOX_TOKEN = process.env.MapboxAccessToken; // eslint-disable-line

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0
});

const pointLight1 = new PointLight({
  color: [255, 255, 255],
  intensity: 0.8,
  position: [-0.144528, 49.739968, 80000]
});

const pointLight2 = new PointLight({
  color: [255, 255, 255],
  intensity: 0.8,
  position: [-3.807751, 54.104682, 8000]
});

const lightingEffect = new LightingEffect({ambientLight, pointLight1, pointLight2});

const material = {
  ambient: 0.64,
  diffuse: 0.6,
  shininess: 32,
  specularColor: [51, 51, 51]
};

const INITIAL_VIEW_STATE = {
  longitude: 126.9779,
  latitude: 37.5663,
  zoom: 10,
  minZoom: 1,
  maxZoom: 15,
  pitch: 40.5,
  bearing: -27
};

// 더 많은 세팅: https://colorbrewer2.org
// set "Number of data classes" to 6
export const colorRange = [
  [255, 255, 255, 30],
  [255, 255, 255, 60],
  [255, 255, 255, 90],
  [255, 255, 255, 120],
  [255, 255, 255, 150],
  [255, 255, 255, 180],
  [255, 255, 255, 210],
];

function getTooltip({object}) {
  if (!object) {
    return null;
  }
  const lat = object.position[1];
  const lng = object.position[0];
  const count = object.points.length;

  return `\
    latitude: ${Number.isFinite(lat) ? lat.toFixed(6) : ''}
    longitude: ${Number.isFinite(lng) ? lng.toFixed(6) : ''}
    ${count} Accidents`;
}

/* eslint-disable react/no-deprecated */
export default function App({
  data,
  mapStyle = 'mapbox://styles/mapbox/dark-v9',
  radius = 800,
  lowerPercentile = 0,
  upperPercentile = 100,
  coverage = 0.86
}) {
  const layers = [
    // // reference: https://deck.gl/docs/api-reference/aggregation-layers/hexagon-layer
    new HexagonLayer({
      id: 'wifi',
      colorRange,
      coverage,
      data,
      // elevationRange: [50, 500],
      // elevationScale: 5, //data && data.length ? 50 : 0,
      extruded: false,
      getPosition: d => d,
      pickable: true,
      radius,
      // upperPercentile,
      material,
      // transitions: {
      //   elevationScale: 50
      // }
    }),
    new IconLayer({
      id: 'icon-layer',
      data,
      pickable: true,
      // iconAtlas and iconMapping are required
      // getIcon: return a string
      iconAtlas: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png',
      iconMapping: {
        marker: {x: 0, y: 0, width: 128, height: 128, mask: true, anchorY: 128}
      },
      getIcon: d => 'marker',
      sizeScale: 5,
      getPosition: d => d,
      getSize: d => 7,
      getColor: d => [0, 192, 72]
    }),

  ];

  return (
    <DeckGL
      layers={layers}
      effects={[lightingEffect]}
      initialViewState={INITIAL_VIEW_STATE}
      controller={true}
      getTooltip={getTooltip}
    >
      <StaticMap
        reuseMaps
        mapStyle={mapStyle}
        preventStyleDiffing={true}
        mapboxApiAccessToken={MAPBOX_TOKEN}
      />
    </DeckGL>
  );
}

function is_coordinates_valid(lng,lat) {
  return (Number.isFinite(lng) 
    && Number.isFinite(lat) 
    && lat >= -90 
    && lat <= 90);
}

async function renderBikestop(container) {
  // read CSV file
  const BIKESTOP_DATA = await fetch("data/공공자전거 대여소 정보(20.07.13 기준) UTF-8.csv")
    .then(response => response.text())
    .then(text => readString(text).data.map(d => [Number(d[5]), Number(d[4])]))

  render(<App data={BIKESTOP_DATA} />, container);
}

export function renderToDOM(container) {
  renderBikestop(container);
}