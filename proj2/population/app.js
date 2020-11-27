import React from 'react';
import {render} from 'react-dom';
import {StaticMap} from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import {GeoJsonLayer} from '@deck.gl/layers';
import {LightingEffect, AmbientLight, _SunLight as SunLight} from '@deck.gl/core';
//import {scaleThreshold} from 'd3-scale';
import {scaleSequential} from 'd3-scale';
//import {interpolateRainbow} from 'd3-scale-chromatic';
import {interpolateReds} from 'd3-scale-chromatic';
// import {readString} from "react-papaparse";

const MAPBOX_TOKEN = process.env.MapboxAccessToken; 

export const COLOR_SCALE = x =>
  // https://github.com/d3/d3-scale-chromatic
    (
      scaleSequential()
      .domain([0, 500])
      .interpolator(interpolateReds)
    )(x) // return a string color "rgb(R,G,B)"
    .slice(4,-1) // extract "R,G,B"
    .split(',') // spline into an array ["R", "G", "B"]
    .map(x => parseInt(x,10)); // convert to [R, G, B]


const INITIAL_VIEW_STATE = {
  // 서울시청 좌표
  latitude: 37.5663,
  longitude: 126.9779,
  zoom: 11,
  maxZoom: 13,
  pitch: 45,
  bearing: 0
};

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0
});

const dirLight = new SunLight({
  timestamp: Date.UTC(2019, 7, 1, 0),
  color: [255, 255, 255],
  intensity: 1.0,
  _shadow: false
});

function getTooltip({object}) {
  return (
    object && {
      html: `
        <strong>${object.properties.SIG_KOR_NM}</strong>
        <div>확진자: ${object.properties.n_confirmed}</div>
      `
    }
  );
}

export default function App({data = DATA_URL, mapStyle = 'mapbox://styles/mapbox/light-v9'}) {

  const lightingEffect = new LightingEffect({ambientLight, dirLight});
  lightingEffect.shadowColor = [0, 0, 0, 0.5];

  const layers = [
    // reference: https://deck.gl/docs/api-reference/layers/geojson-layer
    new GeoJsonLayer({
      id: 'population',
      data,
      opacity: 1,
      // stroked: false,
      filled: true,
      extruded: true,
      wireframe: false,
      getElevation: f => f.properties.n_confirmed * 10,
      getFillColor: f => COLOR_SCALE(f.properties.n_confirmed),
      // getLineColor: [0, 0, 0, 0],
      pickable: true
    })
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

async function renderCOVID19(container) {
  const DATA_JSON    = 'data/서울시 코로나19 확진자 현황 201122.json';
  const DATA_GEOJSON = 'data/SIG_202005/SIG_WGS84.json';

  // 두 파일을 비동기적으로 읽기
  const FETCHED_VALUES = await Promise.all([
    fetch(DATA_JSON).then(response => response.json()),
    fetch(DATA_GEOJSON).then(response => response.json())
  ]);

  const COVID19_data = FETCHED_VALUES[0].DATA;
  const GEO_DATA     = FETCHED_VALUES[1];

  // count the number of confirmed patients
  const n_confirmed = {};
  for (const { corona19_area } of COVID19_data) {
    n_confirmed[corona19_area] = (n_confirmed[corona19_area] || 0) + 1;
  }

  for (const feature of GEO_DATA.features) {
    feature.properties.n_confirmed = n_confirmed[feature.properties.SIG_KOR_NM] || 0;
  }

  render(<App data={GEO_DATA} />, container);
}

export function renderToDOM(container) {
  renderCOVID19(container);
}