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
  height: [hMargin, height-2*hMargin],
  width: [wMargin, width-2*wMargin],
  fill: ['red', 'blue'],
  size: [5, 15],
}

const getScale = (encoding, dataset, encodable, inverse) => {
  const min = getMin(dataset, encodable);
  const max = getMax(dataset, encodable);
  const domain = inverse ? [max, min] : [min, max];
  return d3.scaleLinear()
    .domain(domain)
    .range(encodingMinMaxes[encoding]);
}

function applyTransforms(v, transforms) {
  if (!transforms.length) {
    return v;
  }
  try {
    return eval(transforms);
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.log('invalid transforms');
      return v;
    }
  }
}

function encode(layerIdx, inverse, encoding, dataset, encodable, transforms) {
  const svg = d3.select('#chart');
  const rects = svg.selectAll('rect').filter(`.rect-${layerIdx}`);
  if (dataset != -1) {
    const scale = getScale(encoding, dataset, encodable, inverse);
    rects.each(function(d, idx) {
      const rect = d3.select(this);
      if (encoding == 'size') {
        rect
          .attr('width',
            getData(scale, data[dataset][idx][encodable], transforms))
          .attr('height',
            getData(scale, data[dataset][idx][encodable], transforms));

      } else {
        rect
          .attr(encoding,
            getData(scale, data[dataset][idx][encodable], transforms));
      }
    })
  } else {
    rects.each(function(d, idx) {
      const rect = d3.select(this);
      if (encoding == 'size') {
        rect
          .attr('width', applyTransforms(0, transforms))
          .attr('height', applyTransforms(0, transforms));
      } else {
        rect.attr(encoding, applyTransforms(0, transforms));
      }
    });
  }
}

function findEncoding(val, data) {
  return data.filter(el => {
    if (el.encoding) {
      return el.encoding.value == val;
    }
    return false;
  })[0];
}

function connectDots(xEncoding, yEncoding, layerIdx) {
  const xDataset = xEncoding.dataset;
  const xEncodable = xEncoding.encodable;
  const xInverse = xEncoding.inverse;
  const xTransforms = xEncoding.transforms;

  const yDataset = yEncoding.dataset;
  const yEncodable = yEncoding.encodable;
  const yInverse = yEncoding.inverse;
  const yTransforms = yEncoding.transforms;

  const svg = d3.select('#chart');
  const line = svg.selectAll('path').filter(`.path-${layerIdx}`);

  const xScale = getScale('x', xDataset.value, xEncodable.value, xInverse);
  const yScale = getScale('y', yDataset.value, yEncodable.value, yInverse);

  let path = '';
  path += data[1].map((el, idx) => {
    return 'L'
      + getData(
        xScale, data[xDataset.value][idx][xEncodable.value], xTransforms)
      + ' '
      + getData(
        yScale, data[yDataset.value][idx][yEncodable.value], yTransforms)
      + ' ';
  });
  path = "M" + path.slice(1);
  line
    .attr('stroke-width', 3)
    .attr('stroke', 'black')
    .attr('fill', 'none')
    .attr('d', path);
}

function getData(scale, val, transforms) {
  console.log(val);
  return applyTransforms(scale(val), transforms);
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

    // svg.selectAll('rect').remove();
    svg.selectAll('path').remove();

    layers.forEach((layer, layerIdx) => {
      const { properties } = layer;
      if (svg.selectAll('rect').filter(`.rect-${layerIdx}`).empty()) {
        data[0].forEach((el, idx) => {
        svg.append('svg:rect')
          .attr('class', `rect-${layerIdx}`)
          .attr('x', defaultEncodings.x)
          .attr('y', defaultEncodings.y)
          .attr('width', defaultEncodings.width)
          .attr('height', defaultEncodings.height);
        })
      }

      if (properties.plotLine) {
        svg.append('svg:path').attr('class', `path-${layerIdx}`);
        const xEncoding = findEncoding('x', layers[layerIdx].properties.data);
        const yEncoding = findEncoding('y', layers[layerIdx].properties.data);
        if (this.canPlotLine(layerIdx)) {
          connectDots(
            xEncoding,
            yEncoding,
            layerIdx,
            xEncoding.transforms,
          );
        }
      }

      properties.data.forEach(property => {
        if (property.encoding.value &&
          (property.encodable.value)) {
          encode(
            layerIdx,
            property.inverse,
            property.encoding.value,
            property.dataset.value,
            property.encodable.value,
            property.transforms,
          );
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
      transforms: 'v',
      inverse: false,
      encoding: '',
      dataset: { value: -1, label: 'Constant' },
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
        Plot Line
        <input
          type="checkbox"
          onClick={this.handlePlotLine.bind(this, layerIdx)}
        />
      </span>
    );
  }

  handleInverse(layerIdx, rowIdx) {
   const { layers } = this.state;
    layers[layerIdx].properties.data[rowIdx].inverse =
      !layers[layerIdx].properties.data[rowIdx].inverse;
    this.setState({ layers });
  }

  renderInverseCheckbox(layerIdx, rowIdx) {
    return (
      <span>
        Inverse
        <input
          type="checkbox"
          onClick={this.handleInverse.bind(this, layerIdx, rowIdx)}
        />
      </span>
    );
  }

  handleTransformsChange(layerIdx, rowIdx, e) {
    const { layers } = this.state;
    layers[layerIdx].properties.data[rowIdx].transforms = e.target.value;
    this.setState({ layers });
  }

  renderTransformsInput(layerIdx, rowIdx) {
    const { layers } = this.state;
    return (
      <span className="control">
        Transforms
        <input
          type="text"
          value={layers[layerIdx].properties.data[rowIdx].transforms}
          onChange={this.handleTransformsChange.bind(this, layerIdx, rowIdx)}
        />
      </span>
    );
  }

  renderLayers() {
    const { layers } = this.state;
    return layers.map((layer, layerIdx) => {
      const propertyRows = layer.properties.data.map((row, rowIdx) => {
        const encodingOptions = encodingsList.map(encoding => {
          return { value: encoding, label: encoding };
        });
        const datasetOptions = rawData.map((dataset, dataIdx) => {
          return { value: dataIdx, label: dataset.name };
        });
        datasetOptions.push({
          value: -1,
          label: 'Constant',
        })
        const propertyRow = (
          <div className="property-row" key={rowIdx}>
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
            {this.renderInverseCheckbox(layerIdx, rowIdx)}
            {this.renderTransformsInput(layerIdx, rowIdx)}
          </div>
        );
        return propertyRow;
      });
      return (
        <div className="layer-row" key={layerIdx}>
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
