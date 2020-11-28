import React from 'react';
import {render} from 'react-dom';
import {StaticMap} from 'react-map-gl';
import {AmbientLight, PointLight, LightingEffect} from '@deck.gl/core';
import {IconLayer} from '@deck.gl/layers';
import {HexagonLayer} from '@deck.gl/aggregation-layers';
import DeckGL from '@deck.gl/react';
import {readString} from "react-papaparse";

// Set your mapbox token here
const MAPBOX_TOKEN = process.env.MapboxAccessToken;

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
  longitude: 126.9679,
  latitude: 37.5203,
  zoom: 11.5,
  minZoom: 1,
  maxZoom: 15,
  pitch: 52,
  bearing: 15
};

// 더 많은 세팅: https://colorbrewer2.org
// set "Number of data classes" to 6
export const colorRange = [
  [226, 232, 255, 40],
  [226, 232, 255, 70],
  [226, 232, 255, 100],
  [226, 232, 255, 130],
  [226, 232, 255, 160],
  [226, 232, 255, 190],
  [226, 232, 255, 220],
];

function getTooltip({object}) {
  if (!object) {
    return null;
  }

  if (object.position && object.points) {
    // hexagon
    const lat = object.position[1];
    const lng = object.position[0];
    const count = object.points.length;
  
    return {
      html: `\
        <strong>총 ${count}곳</strong><br><br>
        <small>
          (${Number.isFinite(lat) ? lat.toFixed(6) : ''}, ${Number.isFinite(lng) ? lng.toFixed(6) : ''})
        </small>
        `
    };
  } else {
    return {
      html: `\
        <strong>[${object[0]}] ${object[1]}</strong><br>
        <small>
        ${object[9]}방식 ${object[7] + object[8]}대<br><br>
        ${object[3]}<br>
        (${object[4]}, ${object[5]})
        </small>
        `
    };
  }
}

/* eslint-disable react/no-deprecated */
export default function App({
  data,
  mapStyle = 'mapbox://styles/mapbox/dark-v9',
}) {
  const layers = [
    // // reference: https://deck.gl/docs/api-reference/aggregation-layers/hexagon-layer
    new HexagonLayer({
      id: 'wifi',
      colorRange,
      coverage: 0.92,
      data,
      extruded: false,
      getPosition: d => [Number(d[5]), Number(d[4])],
      pickable: true,
      radius: 800,
      material,
    }),
    new IconLayer({
      id: 'icon-layer',
      data,
      pickable: true,
      iconAtlas: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png',
      iconMapping: {
        marker: {x: 0, y: 0, width: 128, height: 128, mask: true, anchorY: 128}
      },
      getIcon: d => 'marker',
      sizeScale: 5,
      getPosition: d => [Number(d[5]), Number(d[4])],
      getSize: d => 6,
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

async function renderBikestop(container) {
  // read CSV file
  const BIKESTOP_DATA = await fetch("data/공공자전거 대여소 정보(20.07.13 기준) UTF-8.csv")
    .then(fethed => fethed.text())
    .then(text => readString(text).data) // split text into rows
    .then(data => data.filter(row => row[0])); // filter invalid row

  render(<App data={BIKESTOP_DATA} />, container);
}

export function renderToDOM(container) {
  renderBikestop(container);
}