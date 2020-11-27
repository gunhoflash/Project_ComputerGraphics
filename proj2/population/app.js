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
import {readString} from "react-papaparse";

const MAPBOX_TOKEN = process.env.MapboxAccessToken; 

export const COLOR_SCALE = x =>
  // https://github.com/d3/d3-scale-chromatic
    (
      scaleSequential()
      .domain([0, 1])
      .interpolator(interpolateReds)
    )(x) // return a string color "rgb(R,G,B)"
    .slice(4, -1) // extract "R,G,B"
    .split(',') // spline into an array ["R", "G", "B"]
    .map(x => parseInt(x, 10)); // convert to [R, G, B]

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

const lightingEffect = new LightingEffect({ambientLight, dirLight});
lightingEffect.shadowColor = [0, 0, 0, 0.5];

function getTooltip({object}) {
  return (
    object && {
      html: `
        <strong>${object.properties.SIG_KOR_NM}</strong>
        <ul>
          <li>확진자: ${object.properties.n_confirmed}명</li>
          <li>주민등록인구: ${object.properties.population}명</li>
          <li>확진자 비율: ${object.properties.confirmed_ratio}%</li>
          <li>확진자 비율 심각도: ${parseInt(object.properties.confirmed_ratio_adjusted * 100)}%</li>
          <li>면적: ${object.properties.area}㎢</li>
          <li>인구밀도: ${parseInt(object.properties.population / object.properties.area)} 명/㎢</li>
        </ul>
      `
    }
  );
}

export default function App({data = DATA_URL, mapStyle = 'mapbox://styles/mapbox/light-v9'}) {

  // reference: https://deck.gl/docs/api-reference/layers/geojson-layer
  const layers = [
    new GeoJsonLayer({
      id: 'population',
      data,
      opacity: 1,
      filled: true,
      extruded: true,
      wireframe: false,
      getElevation: f => f.properties.population / f.properties.area / 5,
      getFillColor: f => COLOR_SCALE(f.properties.confirmed_ratio_adjusted),
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
  const FILE_NAME_COVID19    = 'data/서울시 코로나19 확진자 현황 201122.json';
  const FILE_NAME_GEOJSON    = 'data/SIG_202005/SIG_WGS84.json';
  const FILE_NAME_POPULATION = 'data/서울시 주민등록인구 (구별) 통계.txt';
  const FILE_NAME_AREA       = 'data/서울시 행정구역 (구별) 통계.txt';

  // read data files
  const [ COVID19_DATA, GEO_DATA, POPULATION_DATA, AREA_DATA ] = await Promise.all([
    fetch(FILE_NAME_COVID19).then(response => response.json()),
    fetch(FILE_NAME_GEOJSON).then(response => response.json()),
    fetch(FILE_NAME_POPULATION).then(response => response.text()),
    fetch(FILE_NAME_AREA).then(response => response.text())
  ]);

  const district = {};
  let min_ratio = 1;
  let max_ratio = 0;

  // init district data
  for (const feature of GEO_DATA.features) {
    district[feature.properties.SIG_KOR_NM] = {
      n_confirmed: 0,
      population: 0,
      confirmed_ratio: 0,
      confirmed_ratio_adjusted: 0,
      area: 0,
    };
  }

  // count the number of confirmed patients
  for (const { corona19_area } of COVID19_DATA.DATA) {
    if (district[corona19_area]) {
      district[corona19_area].n_confirmed++;
    }
  }

  // get population of each district
  for (const population of readString(POPULATION_DATA).data) {
    if (district[population[1]]) {
      district[population[1]].population = Number(population[3].replace(/,/g, ''));
    }
  }

  // calculate confirmed ratio of each district
  for (const district_info of Object.values(district)) {
    district_info.confirmed_ratio = district_info.n_confirmed / district_info.population;
    max_ratio = Math.max(max_ratio, district_info.confirmed_ratio);
    min_ratio = Math.min(min_ratio, district_info.confirmed_ratio);
  }

  // adjust confirmed ratio
  for (const district_info of Object.values(district)) {
    district_info.confirmed_ratio_adjusted = (district_info.confirmed_ratio - min_ratio) / (max_ratio - min_ratio);
  }

  // get area of each district
  for (const area of readString(AREA_DATA).data) {
    if (district[area[1]]) {
      district[area[1]].area = Number(area[2]);
    }
  }

  // update all info of each district
  for (const feature of GEO_DATA.features) {
    feature.properties = { ...feature.properties, ...district[feature.properties.SIG_KOR_NM] };
  }

  render(<App data={GEO_DATA} />, container);
}

export function renderToDOM(container) {
  renderCOVID19(container);
}