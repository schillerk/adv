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
    name: 'dataset 0',
    time: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    value: [11, 7, 4, 4, 10, 5, 6, 3, 3, 6, 3, 1] ,
  },
  {
    name: 'dataset 1',
    time: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    value: [-11, -7, -4, -4, -10, 5, 6, 3, 3, 6, 3, 1] ,
  },
  {
    name: 'dataset 2',
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
  x: wMargin,
  y: hMargin,
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

function encode(layerIdx, encoding, dataset, encodable) {
  const svg = d3.select('#chart');
  const rects = svg.selectAll('rect').filter(`.id-${layerIdx}`);
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

function findEncoding(val, data) {
  return data.filter(el => {
    if (el.encoding) {
      return el.encoding.value == val;
    }
    return false;
  })[0];
}

function connectDots(xDataset, xEncodable, yDataset, yEncodable, layerIdx) {
  const svg = d3.select('#chart');
  const line = svg.selectAll('path').filter(`.id-${layerIdx}`);
  console.log(line);
  console.log(layerIdx);
  const scaleX = getScale('x', xDataset.value, xEncodable.value);
  const scaleY = getScale('y', yDataset.value, yEncodable.value);
  let path = '';
  path += data[1].map((el, idx) => {
    return 'L' + scaleX(data[xDataset.value][idx][xEncodable.value]) + ' ' + scaleY(data[yDataset.value][idx][yEncodable.value]) + ' ';
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
      .attr('id', 'chart-svg')
      .attr('width', width + 2*wMargin)
      .attr('height', height + 2*hMargin);
  }

  componentDidUpdate() {
    const { layers } = this.state;
    const svg = d3.select('#chart-svg');

    svg.selectAll('rect').remove();
    svg.selectAll('path').remove();

    layers.forEach((layer, layerIdx) => {
      const { properties } = layer;
      data[0].forEach((el, idx) => {
        svg.append('svg:rect')
          .attr('class', `id-${layerIdx}`)
          .attr('x', defaultEncodings.x)
          .attr('y', defaultEncodings.y)
          .attr('width', defaultEncodings.width)
          .attr('height', defaultEncodings.height);
      })

      properties.data.forEach(property => {
        if (property.encoding.value &&
          (property.dataset.value != -1 && property.encodable.value)
        ) {
          encode(
            layerIdx,
            property.encoding.value,
            property.dataset.value,
            property.encodable.value,
          );
        }
        if (properties.plotLine) {
          svg.append('svg:path').attr('class', `id-${layerIdx}`);
          const xEncoding = findEncoding('x', layers[layerIdx].properties.data);
          const yEncoding = findEncoding('y', layers[layerIdx].properties.data);
          if (this.canPlotLine(layerIdx)) {
            const xDataset = xEncoding.dataset;
            const xEncodable = xEncoding.encodable;
            const yDataset = yEncoding.dataset;
            const yEncodable = yEncoding.encodable;
            connectDots(xDataset, xEncodable, yDataset, yEncodable, layerIdx);
          }
        }
      })
    })
  }

  createNewLayer() {
    const { layers } = this.state;
    layers.push({
      properties: {
        plotLine: false,
        data: [],
      }
    });
    this.setState({ layers });
  }

  handleChange(val, idx, rowIdx, e) {
    const { layers } = this.state;
    layers[idx].properties.data[rowIdx][val] = e;
    this.setState({
      layers
    });
  }

  createNewProperty(idx) {
    const { layers } = this.state;
    layers[idx].properties.data.push({
      encoding: '',
      dataset: { value: -1, label: 'none' },
      encodable: '',
    });
    this.setState({ layers });
  }

  maybeRenderEncodables(idx, rowIdx) {
    const { layers } = this.state;
    const dataset = layers[idx].properties.data[rowIdx].dataset;
    if (dataset.value == -1) {
      return;
    }
    const encodablesOptions = Object.keys(rawData[dataset.value]).map(key => {
      return { value: key, label: key }
    });
    return (
      <Select
        className="select"
        value={layers[idx].properties.data[rowIdx].encodable}
        onChange={this.handleChange.bind(this, 'encodable', idx, rowIdx)}
        options={encodablesOptions}
      />
    );
  }

  handlePlotLine(layerIdx) {
    const { layers } = this.state;
    layers[layerIdx].properties.plotLine =
      !layers[layerIdx].properties.plotLine;
    this.setState({ layers });
  }

  canPlotLine(layerIdx) {
    const { layers } = this.state;
    const xEncoding = findEncoding('x', layers[layerIdx].properties.data);
    const yEncoding = findEncoding('y', layers[layerIdx].properties.data);
    if ((xEncoding && yEncoding) &&
      ((xEncoding.dataset && xEncoding.encodable) &&
      (yEncoding.dataset && yEncoding.encodable))) {
      return true;
    }
    return false;
  }

  maybeRenderLineCheckbox(layerIdx) {
   return this.canPlotLine(layerIdx) && (
      <span>
        <input
          type="checkbox"
          onClick={this.handlePlotLine.bind(this, layerIdx)}
        />
        Plot Line
      </span>
    );
  }

  renderLayers() {
    const { layers } = this.state;
    return layers.map((layer, layerIdx) => {
      const propertyRows = layer.properties.data.map((row, rowIdx) => {
        const encodingOptions = encodingsList.map(encoding => {
          return { value: encoding, label: encoding }
        });
        const datasetOptions = rawData.map((dataset, layerIdx) => {
          return { value: layerIdx, label: dataset.name };
        })
        const propertyRow = (
          <div className="property-row">
            {rowIdx}
            <Select
              className="select"
              value={layers[layerIdx].properties.data[rowIdx].encoding}
              onChange={this.handleChange.bind(this, 'encoding', layerIdx, rowIdx)}
              options={encodingOptions}
            />
            <Select
              className="select"
              value={layers[layerIdx].properties.data[rowIdx].dataset}
              onChange={this.handleChange.bind(this, 'dataset', layerIdx, rowIdx)}
              options={datasetOptions}
            />
            {this.maybeRenderEncodables(layerIdx, rowIdx)}
          </div>
        );
        return propertyRow;
      });
      return (
        <div className="layer-row">
          <div className="button" onClick={this.createNewProperty.bind(this, layerIdx)}>
            New Property
          </div>
          {this.maybeRenderLineCheckbox(layerIdx)}
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
