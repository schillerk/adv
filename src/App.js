import React, { Component } from 'react';
import Select from 'react-select';
import * as d3 from "d3";

const height = 400;
const width = 600;
const hMargin = 50;
const wMargin = 50;

const encodingsList = ['x', 'y', 'height', 'width', 'fill', 'size'];

const rawData = [
  {
    name: 'dataset 1',
    time: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    value: [11, 7, 4, 4, 10, 5, 6, 3, 3, 6, 3, 1] ,
  },
  {
    name: 'dataset 2',
    time: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    value: [-11, -7, -4, -4, -10, 5, 6, 3, 3, 6, 3, 1] ,
  },
  {
    name: 'dataset 3',
    time: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    value: [-.11, .7, .4, .4, .10, 5, 6, 3, 3, .6, .3, .1] ,
  },
]

const data = rawData.map(series => {
  return series.time.map((el, idx) => {
    return {
      time: series.time[idx],
      value: series.value[idx],
    };
  });
})

function getMin(dataset, encodable) {
  return data[dataset].reduce((el, min) => {
    return el[encodable] < min[encodable] ? el : min;
  }, data[dataset][0])[encodable];
}

function getMax(dataset, encodable) {
  return data[dataset].reduce((el, max) => {
    return el[encodable] > max[encodable] ? el : max;
  }, data[dataset][0])[encodable];
}

const defaultEncodings = {
  x: 0,
  y: 0,
  height: 5,
  width: 5,
}

const encodingMinMaxes = {
  x: [wMargin, width-2*wMargin],
  y: [height-2*hMargin, hMargin],
  height: [height-2*hMargin, 5],
  width: [5, width-2*wMargin],
  fill: ['red', 'blue'],
  size: [5, 15],
}

const getScale = (encoding, dataset, encodable) => {
  const min = getMin(dataset, encodable);
  const max = getMax(dataset, encodable);
  return d3.scaleLinear()
    .domain([min, max])
    .range(encodingMinMaxes[encoding]);
}

function encode(encoding, dataset, encodable) {
    const svg = d3.select('#chart');
    const rects = svg.selectAll('rect');
    const scale = getScale(encoding, dataset, encodable);
    rects.each(function(d, idx) {
      const rect = d3.select(this);
      if (encoding == 'size') {
        rect
          .attr('width', scale(data[dataset][idx][encodable]))
          .attr('height', scale(data[dataset][idx][encodable]));

      }
      rect.attr(encoding, scale(data[dataset][idx][encodable]));
    })
}

function connectDots(encodingX, encodingY) {
  const svg = d3.select('#chart');
  const line = svg.select('path');
  const scaleX = getScale(encodingX, 1, 'time');
  const scaleY = getScale(encodingY, 1, 'value');
  let path = '';
  path += data[1].map((el, idx) => {
    return 'L' + scaleX(el.time) + ' ' + scaleY(el.value) + ' ';
  });
  path = "M" + path.slice(1);
  line
    .attr('strokeWidth', 3)
    .attr('stroke', 'black')
    .attr('fill', 'none')
    .attr('d', path);
}

class App extends Component {
  constructor() {
    super();
    this.state = {
      layers: [],
    };
  }

  componentDidMount() {
    const svg = d3.select('#chart')
      .append('svg:svg')
      .attr('width', width + 2*wMargin)
      .attr('height', height + 2*hMargin);

    data[0].forEach((el, idx) => {
      svg.append('svg:rect')
        .attr('x', defaultEncodings.x)
        .attr('y', defaultEncodings.y)
        .attr('width', defaultEncodings.width)
        .attr('height', defaultEncodings.height);
    })

    svg.append('svg:path');
  }

  componentDidUpdate() {
    const { layers } = this.state;
    layers.forEach(layer => {
      const { properties } = layer;
      properties.forEach(property => {
        if (property.encoding.value &&
          (property.dataset.value != -1 && property.encodable.value)
        ) {
          encode(
            property.encoding.value,
            property.dataset.value,
            property.encodable.value,
          );
        }
      })
    })
    // const svg = d3.select('svg');
    // encode('x', 0, 'time');
    // encode('y', 1, 'value');
    // encode('fill', 2, 'value');
    // encode('size', 1, 'value');

    // connectDots('x', 'y');
  }

  createNewLayer() {
    const { layers } = this.state;
    layers.push({ properties: [] });
    this.setState({ layers });
  }

  handleChange(val, idx, rowIdx, e) {
    const { layers } = this.state;
    layers[idx].properties[rowIdx][val] = e;
    this.setState({
      layers
    });
  }

  createNewProperty(idx) {
    const { layers } = this.state;
    layers[idx].properties.push({
      encoding: '',
      dataset: { value: -1, label: 'none' },
      encodable: '',
    });
    this.setState({ layers });
  }

  maybeRenderEncodables(idx, rowIdx) {
    const { layers } = this.state;
    const dataset = layers[idx].properties[rowIdx].dataset;
    if (dataset.value == -1) {
      return;
    }
    const encodablesOptions = Object.keys(rawData[dataset.value]).map(key => {
      return { value: key, label: key }
    });
    return (
      <Select
        className="select"
        value={layers[idx].properties[rowIdx].encodable}
        onChange={this.handleChange.bind(this, 'encodable', idx, rowIdx)}
        options={encodablesOptions}
      />
    );
  }

  renderLayers() {
    const { layers } = this.state;
    return layers.map((layer, idx) => {
      const propertyRows = layer.properties.map((row, rowIdx) => {
        const encodingOptions = encodingsList.map(encoding => {
          return { value: encoding, label: encoding }
        });
        const datasetOptions = rawData.map((dataset, idx) => {
          return { value: idx, label: dataset.name };
        })
        const propertyRow = (
          <div className="property-row">
            {rowIdx}
            <Select
              className="select"
              value={layers[idx].properties[rowIdx].encoding}
              onChange={this.handleChange.bind(this, 'encoding', idx, rowIdx)}
              options={encodingOptions}
            />
            <Select
              className="select"
              value={layers[idx].properties[rowIdx].dataset}
              onChange={this.handleChange.bind(this, 'dataset', idx, rowIdx)}
              options={datasetOptions}
            />
            {this.maybeRenderEncodables(idx, rowIdx)}
          </div>
        );
        return propertyRow;
      });
      return (
        <div className="layer-row">
          <div className="button" onClick={this.createNewProperty.bind(this, idx)}>
            New Property
          </div>
          {propertyRows}
        </div>
      );
    })
  }

  render() {
    return (
      <div className="App">
        <div className="button" onClick={this.createNewLayer.bind(this)}>New Layer</div>
        {this.renderLayers()}
        <div id="chart"></div>
      </div>
    );
  }
}

export default App;
