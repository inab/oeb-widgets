<template>
    <v-container fluid>
    <v-row>
      <v-col cols="8">
        <div class="butns">

          <!-- BUTTONS -->
          <v-btn-toggle class="custom-btn-toggle">

            <!-- Dropdown for Classification -->
            <v-menu offset-y>
              <template v-slot:activator="{ on, attrs }">
                <v-btn outlined v-bind="attrs" v-on="on" class="button-classification custom-height-button" :disabled="loading">
                  {{classificationButtonText}}
                </v-btn>
              </template>
              <v-list>
                <v-list-item class="menu-item"  @click="noClassification">
                  <v-list-item-title>No Classification</v-list-item-title>
                </v-list-item >
                <v-list-item class="menu-item" @click="toggleQuartilesVisibility">
                  <v-list-item-title>Square Quartiles</v-list-item-title>
                </v-list-item>
                <v-list-item class="menu-item" @click="toggleDiagonalQuartile">
                  <v-list-item-title>Diagonal Quartiles</v-list-item-title>
                </v-list-item>
                <v-list-item class="menu-item" @click="toggleKmeansVisibility">
                  <v-list-item-title>K-Means Clustering</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>

            <!-- Reset View / Optimal view -->
            <v-btn @click="toggleView" outlined class="button-resetView custom-height-button">
              {{ viewButtonText }}
            </v-btn>

            <!-- Dropdown for Download -->
            <v-menu offset-y>
              <template v-slot:activator="{ on, attrs }">
                <v-btn outlined v-bind="attrs" v-on="on" class="button-download custom-height-button">
                  Download
                </v-btn>
              </template>
              <v-list>
                <v-list-item class="menu-item" @click="downloadChart('png', datasetId)">
                  <v-list-item-title>PNG</v-list-item-title>
                </v-list-item>
                <v-list-item class="menu-item" @click="downloadChart('pdf', datasetId)">
                  <v-list-item-title>PDF</v-list-item-title>
                </v-list-item>
                <v-list-item class="menu-item" @click="downloadChart('svg', datasetId)">
                  <v-list-item-title>SVG</v-list-item-title>
                </v-list-item>
                <v-divider></v-divider>
                <v-list-item class="menu-item" @click="downloadChart('json', datasetId)">
                  <v-list-item-title>JSON (raw data)</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
            <!-- End of Dropdown for Download -->
          </v-btn-toggle>
        </div>
      </v-col>
    </v-row>

    <v-row id="todownload">
      <v-col cols="8">
        <!-- CHART -->
        <div ref="chart" id="scatterPlot"></div>
        
        <!-- Error message -->
        <CustomAlert
          v-if="showMessageError"
          title="Warning"
          message="At least four participants are required for the benchmark!"
          type="warning"
        />

        <!-- ID AND DATE TABLE -->
        <div class="info-table" v-if="datasetModDate">
          <v-simple-table class="custom-table">
          <tbody>
                <tr>
                  <th class="first-th">Dataset ID</th>
                  <td>{{ datasetId }}</td>
                  <th>Last Update</th>
                  <td class="last-td">{{ formatDateString(datasetModDate) }}</td>
                </tr>
              </tbody>
        </v-simple-table>
        </div>
        
      </v-col>

      <!-- Table -->
      <v-col cols="4" class="content-table">
        <transition name="fade">
        <v-simple-table class="tools-table" height="765px" fixed-header v-if="tableData.length > 0" id="benchmarkingTable">
          <thead>
            <tr>
              <th class="tools-th">Participants</th>
              <th class="classify-th">{{ viewKmeans ? 'Clusters' : 'Quartile' }}
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <i
                      class="material-icons custom-alert-icon"
                      v-if="viewSquare === true"
                      v-bind="attrs"
                      v-on="on"
                    >
                      {{ icon }}
                    </i>
                  </template>
                  <div class="quartile-message">
                    <p><b>The Square quartile label</b></p>
                    <p>Quartiles 2 and 3 are 'Mid (M)', representing average rankings, while 'Top (T)' 
                  denotes quartiles above average and 'Bottom (B)' those below, offering clarity in rankin.</p></div>
                </v-tooltip>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in tableData" :key="item.tool_id"
                  :class="{ 'quartil-zero': item.cuartil === 0 }">
              <td class="toolColumn" @click="handleTableRowClick(index)">
                <div class="color-box"
                  :style="{ backgroundColor: markerColors[index % markerColors.length], opacity: (item.cuartil === 0 ? 0.5 : 1) }">
                </div>
                  <span>{{ item.tool_id }}</span>
              </td>

              <td :class="'quartil-' + item.cuartil">{{ item.label }}</td>
            </tr>
          </tbody>

        </v-simple-table>
      </transition>
      </v-col>

    </v-row>
  </v-container>
</template>

<script>
// IMPORTS
import Plotly from 'plotly.js-dist';
import * as statistics from 'simple-statistics';
import CustomAlert from './CustomAlert.vue';
// REQUIREMENTS
var clusterMaker = require('clusters');
const pf = require('pareto-frontier');
const html2canvas = require('html2canvas');
const { jsPDF } = require('jspdf');



export default {
  name: 'ScatterPlot',
  components:{
    CustomAlert
  },
  props: {
    dataJson: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      loading: false,
      datasetId: null,
      datasetModDate: null,
      visualizationData: null,
      optimalview: null,
      formattedDate: null,
      originalData: null,
      markerColors: ['#D62728', '#FF7F0E', '#8C564B', '#E377C2', '#4981B6', '#BCBD22', '#9467BD', '#0C9E7B', '#7F7F7F', '#31B8BD', '#FB8072', '#62D353'],
      colorIndex: 0,
      symbols: ['circle', 'triangle-up', 'pentagon', 'cross', 'x', 'star', 'star-diamond', 'square', 'diamond-tall'],
      currentIndex: 0,
      xValues: [],
      yValues: [],
      toolID: [],
      allToolID: [],
      dataPoints: [],
      paretoPoints: [],
      optimalXaxis: null,
      optimalYaxis: null,
      // Error messages
      showMessageError: false,
      dismissCountDown: 0,
      // View Button
      viewApplied: false,
      // Views by Classification
      viewKmeans: false,
      viewSquare: false,
      viewDiagonal: false,
      // Table data
      tableData: [],
      // Icon Table
      // Square Quartiles
      showShapesSquare: false,
      showAnnotationSquare: false,
      // Diagonal Quartiles
      showShapesDiagonal: false,
      // K-means Clustering
      showShapesKmeans:false,
      shapes: [],
      annotationKmeans: [],

      
    };
  },
  mounted() {
    // Renderizar el scatter plot cuando el componente se monta
    this.renderChart();
  },
  methods: {
    // CREATE PLOT, FUNCTION PRINCIPAL
    // ----------------------------------------------------------------
    async renderChart() {
      // Fetch dataset values
      const data = this.dataJson.inline_data;
      this.datasetId = await this.dataJson._id;
      this.datasetModDate = this.dataJson.dates.modification;
      this.visualizationData = data.visualization;
      this.optimalview = data.visualization.optimization;

      // Save original data for future use
      this.originalData = this.dataJson;

      // Data structures for Plotly
      const traces = [];

      // Data for the Pareto frontier and Quartile
      this.xValues = data.challenge_participants.map((participant) => participant.metric_x);
      this.yValues = data.challenge_participants.map((participant) => participant.metric_y);
      this.toolID = data.challenge_participants.map((participant) => participant.tool_id);
      this.allToolID = data.challenge_participants.map((participant) => participant.tool_id);

      this.dataPoints = data.challenge_participants.map((participant) => [
        participant.metric_x,
        participant.metric_y,
      ]);

      // Calculate Pareto frontier
      if (this.optimalview != null) {
        // Activate classification button
        this.loading = false;

        let direction = this.formatOptimalDisplay(this.optimalview);
        this.paretoPoints = pf.getParetoFrontier(this.dataPoints, { optimize: direction });

        // If the pareto returns only one point, we create two extra points to represent it.
        if (this.paretoPoints.length == 1) {
          const extraPoint = [this.paretoPoints[0][0], 0];
          const extraPoint2 = [Math.max(...this.xValues), this.paretoPoints[0][1]];
          this.paretoPoints.unshift(extraPoint);
          this.paretoPoints.push(extraPoint2);
        }

        const globalParetoTrace = {
          x: this.paretoPoints.map((point) => point[0]),
          y: this.paretoPoints.map((point) => point[1]),
          mode: 'lines',
          type: 'scatter',
          name: '<span style="color:black;">Global Pareto Frontier</span>',
          line: {
            dash: 'dot',
            width: 2,
            color: 'rgb(152, 152, 152)',
          },
          opacity: 0,
        };

        const dynamicParetoTrace = {
          x: this.paretoPoints.map((point) => point[0]),
          y: this.paretoPoints.map((point) => point[1]),
          mode: 'lines',
          type: 'scatter',
          name: 'Dynamic Pareto Frontier',
          line: {
            dash: 'dot',
            width: 2,
            color: 'rgb(244, 124, 33)',
          },
          opacity: 0,
        };

        // Add the pareto trace to the trace array
        traces.push(globalParetoTrace, dynamicParetoTrace);
      } else {
        // Disable classification button
        this.loading = true;

        const globalParetoTrace = {
          x: ['0'],
          y: ['0'],
          mode: 'lines',
          type: 'scatter',
          name: '<span style="color:black;">Global Pareto Frontier</span>',
          line: {
            dash: 'dot',
            width: 2,
            color: 'rgb(152, 152, 152)',
          },
          opacity: 0,
        };
        const dynamicParetoTrace = {
          x: ['0'],
          y: ['0'],
          mode: 'lines',
          type: 'scatter',
          name: 'Dynamic Pareto Frontier',
          line: {
            dash: 'dot',
            width: 2,
            color: 'rgb(244, 124, 33)',
          },
          opacity: 0,
        };
        traces.push(globalParetoTrace, dynamicParetoTrace);
      }

      // Go through each object in challenge participants
      // Create traces
      for (let i = 0; i < data.challenge_participants.length; i++) {
        const participant = data.challenge_participants[i];

        const trace = {
          x: [participant.metric_x],
          y: [participant.metric_y],
          mode: 'markers',
          type: 'scatter',
          marker: {
            size: 14,
            symbol: this.getSymbol(),
            color: this.getColor(),
          },
          name: participant.tool_id,
          showlegend: true,
          error_x: {
            type: 'data',
            array: [participant.stderr_x],
            visible: true,
            color: '#000000',
            width: 2,
            thickness: 0.3,
          },
          error_y: {
            type: 'data',
            array: [participant.stderr_y],
            visible: true,
            color: '#000000',
            width: 2,
            thickness: 0.3,
          },
          opacity: 0,
        };
        traces.push(trace);
      }

      // Create the chart layout
      const layout = {
        autosize: true,
        height: 750,
        annotations: this.getOptimizationArrow(this.optimalview),
        xaxis: {
          title: {
            text: this.visualizationData.x_axis,
            font: {
              family: 'Arial, sans-serif',
              size: 16,
              color: 'black',
              weight: 'bold',
            },
          },
        },
        yaxis: {
          title: {
            text: this.visualizationData.y_axis,
            font: {
              family: 'Arial, sans-serif',
              size: 16,
              color: 'black',
              weight: 'bold',
            },
          },
        },
        margin: { l: 60, r: 10, t: 0, b: 10, pad: 4 },
        legend: {
          orientation: 'h',
          x: 0,
          y: -0.2,
          xref: 'paper',
          yref: 'paper',
          font: {
            size: 16,
          },
        },
        // plot_bgcolor: '#F8F9F9',
        images: this.getImagePosition(this.optimalview),
        showlegend: true,
      };

      const config = {
        displayModeBar: false,
        responsive: true,
        hovermode: false,
      };

      // Create the chart with initial opacity set to 0
      Plotly.newPlot(this.$refs.chart, traces, layout, config).then((gd) => {
        // Animate traces from opacity 0 to 1
        Plotly.animate(gd, {
          data: traces.map((trace, index) => ({
            opacity: 1,
          })),
          traces: Array.from(Array(traces.length).keys()),
          layout: {},
        }, {
          transition: {
            duration: 1000,
            easing: 'cubic-in-out',
          },
          frame: {
            duration: 500,
          },
        });

        // Get ranges from the scatter plot
        const layoutObj = gd.layout;
        this.optimalXaxis = layoutObj.xaxis.range;
        this.optimalYaxis = layoutObj.yaxis.range;

        // Capture legend event
        gd.on('plotly_legendclick', (event) => {
          let traceIndex = event.curveNumber;

          // If Pareto was clicked (index 0) do nothing
          if (traceIndex === 0) {
            return false;
          } else if (traceIndex === 1) {
            return true;
          } else {
            // Update the graph based on the selected trace
            // Si response es false la trace no se oculta de la legend
            let response = this.updatePlotOnSelection(traceIndex);
            if (response == false) {
              return false;
            }
          }
        });
      });
    },



    // ----------------------------------------------------------------
    // PARETO FRONTIER
    // ----------------------------------------------------------------
    // Function to format the optimal display direction
    formatOptimalDisplay(optimization) {
      let direction = null;
      if (optimization){
        if (optimization == 'top-right') {
          direction = 'topRight';
        } else if (optimization == 'top-left') {
          direction = 'topLeft';
        } else if (optimization == 'bottom-right') {
          direction = 'bottomRight';
        }else if (optimization == 'bottom-left') {
          direction = 'bottomLeft';
        }
        return direction
      }else{
        return null
      }
    },

    // ACTIONS FOR TABLE
    // ----------------------------------------------------------------
    // Handle the click on the table
    handleTableRowClick (index) {
      const traceIndex = index + 2; // Adjust the index
      this.toggleTraceVisibility(traceIndex);
      this.updatePlotOnSelection(traceIndex)
    },

    // Toggle trace visibility
    toggleTraceVisibility (traceIndex) {
      const scatterPlotElement = document.getElementById('scatterPlot');
      const plotlyData = scatterPlotElement.data;
      const plotlyLayout = scatterPlotElement.layout;

      if (plotlyData.length <= 5){
        return;
      }

      // Check the visibility state of the trace
      let isVisible = plotlyData[traceIndex].visible;
      if (isVisible === undefined) {
        isVisible = true
      }

      // Count the number of currently visible traces
      let visibleCount = 0;
      plotlyData.forEach(trace => {
        if (trace.visible !== 'legendonly') {
          visibleCount++;
        }
      });

      // If there are only four visible traces and the trace being toggled is currently visible, return without changing its visibility
      if (visibleCount === 6 && isVisible !== 'legendonly') {
        return;
      }

      // Update the visibility state of the trace
      plotlyData[traceIndex].visible = isVisible === true ? 'legendonly' : true;

      // Update the chart with the new data
      Plotly.react(this.$refs.chart, plotlyData, plotlyLayout);
    },
    
    // ----------------------------------------------------------------
    // UPDATE PLOT, INTERACTIONS
    // ----------------------------------------------------------------
    // Update the graph based on the selected trace
    updatePlotOnSelection(traceIndex) {
      traceIndex = traceIndex - 2;

      const toolHidden = this.dataPoints[traceIndex].hidden;

      if (!toolHidden) {
        const visibleTools = this.dataPoints.filter((tool) => !tool.hidden);
        if (visibleTools.length <= 4) {
          this.showMessageError = true;
          this.dismissCountDown = 5;

          const timer = setInterval(() => {
            if (this.dismissCountDown > 0) {
              this.dismissCountDown -= 1;
            } else {
              this.showMessageError = false;
              clearInterval(timer);
            }
          }, 1000);
          return false;
        }
      } else {
        this.showMessageError = false;
      }

      this.dataPoints[traceIndex].hidden = !toolHidden;

      const updatedVisibleTools = this.dataPoints.filter((tool) => !tool.hidden);

      const newTraces = null;
      if (this.optimalview != null) {
        let direction = this.formatOptimalDisplay(this.optimalview);
        const newParetoPoints = pf.getParetoFrontier(updatedVisibleTools, { optimize: direction });

        this.newTraces = { 
          x: [newParetoPoints.map((point) => point[0])], 
          y: [newParetoPoints.map((point) => point[1])] 
        };
      }
      

      // Update Square Quartiles
      // ----------------------------------------------------------------
      if (this.viewSquare === true) {
        // If the Square view is active, the quartiles are calculated with the visible traces
        const updatedXCoordinates = updatedVisibleTools.map((participant) => participant[0]);
        const updatedYCoordinates = updatedVisibleTools.map((participant) => participant[1]);

        // Create a list of visible tools with their hiding status
        const visibleTools = this.toolID.map((tool, index) => ({
          name: tool,
          hidden: this.dataPoints[index].hidden
        })).filter(tool => !tool.hidden);

        // List of visible tools
        const visibleToolNames = visibleTools.map(tool => tool.name);
        // Update data with visible tools
        this.calculateQuartiles(updatedXCoordinates, updatedYCoordinates, visibleToolNames);
        this.optimalView()
      }

      // Update Diagonal Quartiles
      // ----------------------------------------------------------------
      if (this.viewDiagonal === true){
        const updatedXCoordinates = updatedVisibleTools.map((participant) => participant[0])
        const updatedYCoordinates = updatedVisibleTools.map((participant) => participant[1])

        // Update data with visible tools
        this.getDiagonalQuartile(updatedXCoordinates, updatedYCoordinates);
        this.optimalView()
      }

      // Update Kmeans Clustering
      // ----------------------------------------------------------------
      if (this.viewKmeans === true) {
          // If the K-means view is active, K-means Clustering is recalculated, otherwise it is not.

          // Create a list of visible tools with their hiding status
          const visibleTools = this.toolID.map((tool, index) => ({
            name: tool,
            hidden: this.dataPoints[index].hidden
          })).filter(tool => !tool.hidden);
          // List of visible tools
          const visibleToolNames = visibleTools.map(tool => tool.name);

          // Recalculate Clustering
          let better = this.optimalview
          this.createShapeClustering(updatedVisibleTools, visibleToolNames, better, this.allToolID);
          this.showShapesKmeans = true;


          // Create a new layout
          const layout = {
            shapes: this.showShapesKmeans ? this.shapes : [],
            annotations: this.getOptimizationArrow(this.optimalview).concat(this.annotationKmeans)
          };
          Plotly.update(this.$refs.chart, newTraces, layout, 1);
      }

      Plotly.update(this.$refs.chart, this.newTraces, {}, 1);
    },

    
    // ----------------------------------------------------------------
    // CLASSIFICATIONS
    // ----------------------------------------------------------------

    // NO CLASSIFICATION
    // ----------------------------------------------------------------
    noClassification(){
      this.tableData = []
      this.viewKmeans = false;
      this.viewSquare = false;
      this.viewDiagonal = false;
      this.showShapesKmeans = false;
      this.showShapesSquare = false;
      this.showAnnotationSquare = false;

       // Reset Plot
      const plot = document.getElementById('scatterPlot')
      if (plot && plot.data) {
        const numTraces = plot.data.length;
        const visibleArray = Array(numTraces).fill(true);

        // Reset Pareto Frontier
        this.dataPoints.forEach(array => { array.hidden = false; });
        const updatedVisibleTools = this.dataPoints.filter((tool) => !tool.hidden);
        if (this.optimalview != null){
          let direction = this.formatOptimalDisplay(this.optimalview);
          const newParetoPoints = pf.getParetoFrontier(updatedVisibleTools, { optimize: direction });

          // Update the trace of the Pareto frontier
          const newTraces = {
            x: [newParetoPoints.map((point) => point[0])],
            y: [newParetoPoints.map((point) => point[1])]
          };

          // Modificar despues
          const layout = {
            shapes: false ? shapes : [],
            annotations: this.getOptimizationArrow(this.optimalview)
          };

          // Update only the trace data, without changing the layout
          Plotly.update(this.$refs.chart, newTraces, layout, 1);

        }
        // restarts the traces
        Plotly.restyle(this.$refs.chart, { visible: visibleArray });
      }
    },


    // ----------------------------------------------------------------
    // SQUARE QUARTILES
    // ----------------------------------------------------------------
    // Function to toggle the visibility of the Square Quartiles
    toggleQuartilesVisibility () {
      if (!this.optimalview){
          return;
      }
      const plot = document.getElementById('scatterPlot')
      if (plot && plot.data) {
        const numTraces = plot.data.length;

        // Reset visibilities. Hide the Kmeans and Show the Square
        this.showShapesKmeans = false;
        this.viewKmeans = false;
        this.viewDiagonal = false;
        this.viewSquare = true;
        this.showShapesSquare = true;
        this.showAnnotationSquare = true;

        // Update visibility of Points
        this.dataPoints.forEach(array => { array.hidden = false; });

        // Calculate Pareto Frontier
        const updatedVisibleTools = this.dataPoints.filter(tool => !tool.hidden);
        const direction = this.formatOptimalDisplay(this.optimalview);
        const newParetoPoints = pf.getParetoFrontier(updatedVisibleTools, { optimize: direction });
        const newTraces = { x: [newParetoPoints.map(point => point[0])], y: [newParetoPoints.map(point => point[1])] };

        const layout = {
          shapes: false ? shapes : [],
          annotations: this.getOptimizationArrow(this.optimalview)
        };

        const visibleArray = Array(numTraces).fill(true);

        Plotly.update(this.$refs.chart, newTraces, layout, 1);
        Plotly.update(this.$refs.chart, { visible: visibleArray });

        this.calculateQuartiles(this.xValues, this.yValues, this.toolID);
        this.optimalView();
      }else{
        console.error("The graph with id 'scatterPlot' has no data")
      } 
    },

    // Calculate square quartiles
    calculateQuartiles (xValues, yValues, toolID){

      const cuartilesX = statistics.quantile(xValues, 0.5);
      const cuartilesY = statistics.quantile(yValues, 0.5);

      let better = this.optimalview
      let allToolsWithId = this.allToolID
      this.sortToolsForSquare(better, allToolsWithId, toolID, cuartilesX, cuartilesY, xValues, yValues)

      // Lines 
      const shapes = [
        {
          type: 'line',
          x0: cuartilesX,
          x1: cuartilesX,
          y0: 0,
          y1: Math.max(...yValues) + Math.max(cuartilesY),
          line: {
            color: '#C0D4E8',
            width: 2,
            dash: 'dash'
          }
        },
        {
          type: 'line',
          y0: cuartilesY,
          y1: cuartilesY,
          x0: 0,
          x1: Math.max(...xValues) + Math.max(cuartilesX),
          line: {
            color: '#C0D4E8',
            width: 2,
            dash: 'dash'
          }
        },
      ];

      // Annotations
      this.annotationSquareQuartile(better)
      // Add Quartiles
      const layout = {
        shapes: this.showShapesSquare ? shapes : [],
      };
      Plotly.relayout(this.$refs.chart, layout);
    },

    // Sort tools for Square Quartiles
    sortToolsForSquare(better, allToolsWithId, visibleToolID, cuartilesX, cuartilesY, xValues, yValues) {
      this.tableData = [];
      allToolsWithId.forEach((tool) => { // Iterate over all tools
        const index = visibleToolID.indexOf(tool);
        const x = index !== -1 ? xValues[index] : null; // Get index and values x, y
        const y = index !== -1 ? yValues[index] : null; // Get index and values x, y

        let cuartil = 0;
        let label = '--';

        if (index !== -1) { // Si la herramienta está presente en visibleToolID
          if (better === "bottom-right") {
            if (x >= cuartilesX && y <= cuartilesY) {
              cuartil = 1;
              label = 'Top';
            } else if (x >= cuartilesX && y > cuartilesY) {
              cuartil = 3;
              label = 'Interquartile';
            } else if (x < cuartilesX && y > cuartilesY) {
              cuartil = 4;
              label = 'Bottom';
            } else if (x < cuartilesX && y <= cuartilesY) {
              cuartil = 2;
              label = 'Interquartile';
            }
          } else if (better === "top-right") {
            if (x >= cuartilesX && y < cuartilesY) {
              cuartil = 3;
              label = 'Interquartile';
            } else if (x >= cuartilesX && y >= cuartilesY) {
              cuartil = 1;
              label = 'Top';
            } else if (x < cuartilesX && y >= cuartilesY) {
              cuartil = 2;
              label = 'Interquartile';
            } else if (x < cuartilesX && y < cuartilesY) {
              cuartil = 4;
              label = 'Bottom';
            }
          } else if (better === "top-left") {
            if (x >= cuartilesX && y < cuartilesY) {
              cuartil = 4;
              label = 'Bottom';
            } else if (x >= cuartilesX && y >= cuartilesY) {
              cuartil = 2;
              label = 'Interquartile';
            } else if (x < cuartilesX && y >= cuartilesY) {
              cuartil = 1;
              label = 'Top';
            } else if (x < cuartilesX && y < cuartilesY) {
              cuartil = 3;
              label = 'Interquartile';
            }
          }
        }
        this.tableData.push({ tool_id: tool, cuartil: cuartil, label: label });
      });
    },

    // Annotation for Square Quartiles
    annotationSquareQuartile (better){
      // Create Annotation
      let position = this.asignaPositionCuartil(better)
      // Add label to the position (Top, Interquartile, Botton)
      const newAnnotation = position.map(({ position, numCuartil }) => {
        let annotation = {};
        switch (position) {
          case 'top-left':
            annotation = {
              xref: 'paper',
              yref: 'paper',
              x: 0.01,
              xanchor: 'left',
              y: 1,
              yanchor: 'top',
              text: numCuartil,
              showarrow: false,
              font: {
                size: 20,
                color: '#5A88B5'
              }
            };
            break;
          case 'bottom-right':
            annotation = {
              xref: 'paper',
              yref: 'paper',
              x: 0.90,
              xanchor: 'left',
              y: 0.05,
              yanchor: 'bottom',
              text: numCuartil,
              showarrow: false,
              font: {
                size: 20,
                color: '#5A88B5'
              }
            };
            break;
          case 'bottom-left':
            annotation = {
              xref: 'paper',
              yref: 'paper',
              x: 0.01,
              xanchor: 'left',
              y: 0.10,
              yanchor: 'top',
              text: numCuartil,
              showarrow: false,
              font: {
                size: 20,
                color: '#5A88B5'
              }
            };
            break;
          case 'top-right':
            annotation = {
              xref: 'paper',
              yref: 'paper',
              x: 0.90,
              xanchor: 'left',
              y: 0.98,
              yanchor: 'top',
              text: numCuartil,
              showarrow: false,
              font: {
                size: 20,
                color: '#5A88B5'
              }
            };
            break;
          default:
            break;
        }
        return annotation;
      });

      const annotations = this.getOptimizationArrow(this.optimalview)
      const layout = {
        annotations: this.showAnnotationSquare ? annotations.concat(newAnnotation) : [],
      };
      Plotly.relayout(this.$refs.chart, layout);
    },

    // Asigna position
    asignaPositionCuartil (better) {
      // 1: top, 2y3: Middle, 4:Botton
      let num_bottom_right, num_bottom_left, num_top_right, num_top_left;
      if (better == "bottom-right") {
        num_bottom_right = "Top"; // 1
        num_bottom_left = "Interquartile"; // 2
        num_top_right = "Interquartile"; // 3
        num_top_left = "Bottom"; // 4
      }
      else if (better == "top-right") {
        num_bottom_right = "Interquartile"; // 3
        num_bottom_left = "Bottom"; // 4
        num_top_right = "Top"; // 1
        num_top_left = "Interquartile"; // 2

      } else if (better == "top-left") {
        num_bottom_right = "Bottom"; // 4
        num_bottom_left = "Interquartile"; // 3
        num_top_right = "Interquartile"; // 2
        num_top_left = "Top"; // 1
      }

      let positions = [{ position: 'bottom-right', numCuartil: num_bottom_right },
      { position: 'bottom-left', numCuartil: num_bottom_left },
      { position: 'top-right', numCuartil: num_top_right },
      { position: 'top-left', numCuartil: num_top_left },]

      return positions
    },

    // ----------------------------------------------------------------
    // DIAGONAL QUARTILES
    // ----------------------------------------------------------------
    // Function to toggle the visibility of the Diagonal Quartiles
    toggleDiagonalQuartile (){
      if (!this.optimalview){
          return;
      }
      const plot = document.getElementById('scatterPlot')
      if (plot && plot.data) {
        const numTraces = plot.data.length;

        this.viewDiagonal = true;
        this.viewSquare = false;
        this.viewKmeans = false;
        // 
        this.showShapesKmeans = false;
        this.showShapesSquare = false;
        this.showShapesDiagonal = true;

        // Update visibility of Points
        this.dataPoints.forEach(array => { array.hidden = false; });

        // Calculate Pareto Frontier
        const updatedVisibleTools = this.dataPoints.filter(tool => !tool.hidden);
        const direction = this.formatOptimalDisplay(this.optimalview);
        const newParetoPoints = pf.getParetoFrontier(updatedVisibleTools, { optimize: direction });
        const newTraces = { x: [newParetoPoints.map(point => point[0])], y: [newParetoPoints.map(point => point[1])] };

        const layout = {
          shapes: false ? shapes : [],
          annotations: this.getOptimizationArrow(this.optimalview)
        };

        const visibleArray = Array(numTraces).fill(true);

        Plotly.update(this.$refs.chart, newTraces, layout, 1);
        Plotly.update(this.$refs.chart, { visible: visibleArray });
        
        this.getDiagonalQuartile(this.xValues, this.yValues)
        this.optimalView()
      }else{
        console.error("The graph with id 'scatterPlot' has no data")
      }  
    },

    // Diagonal Quartile
    getDiagonalQuartile (x_values, y_values){

    let tools_not_hidden = x_values.map((x, i) => [x, y_values[i]]);

    let normalizedValues = this.normalizeData(x_values, y_values);
    let [x_norm, y_norm] = [normalizedValues[0], normalizedValues[1]];

    let max_x = Math.max.apply(null, x_values);
    let max_y = Math.max.apply(null, y_values);
    let better = this.optimalview

    // # compute the scores for each of the tool. based on their distance to the x and y axis
    let scores = []
    let scores_coords = {}; //this object will store the scores and the coordinates
    for (let i = 0; i < x_norm.length; i++) {

      if (better == "bottom-right"){
        scores.push(x_norm[i] + (1 - y_norm[i]));
        scores_coords[x_norm[i] + (1 - y_norm[i])] =  [x_values[i], y_values[i]];
        //append the score to the data array
        tools_not_hidden[i]['score'] = x_norm[i] + (1 - y_norm[i]);
      } 
      else if (better == "top-right"){
        scores.push(x_norm[i] + y_norm[i]);
        scores_coords[x_norm[i] + y_norm[i]] = [x_values[i], y_values[i]];
        //append the score to the data array
        tools_not_hidden[i]['score'] = x_norm[i] + y_norm[i];

      }else if (better == "top-left"){
        scores.push(1 -x_norm[i] + y_norm[i]);
        scores_coords[(1 -x_norm[i]) + y_norm[i]] = [x_values[i], y_values[i]];
        //append the score to the data array
        tools_not_hidden[i]['score'] = (1 -x_norm[i]) + y_norm[i];
      }
    };

    scores.sort(function(a, b){return b-a});

    let first_quartile  = statistics.quantile(scores, 0.25);
    let second_quartile = statistics.quantile(scores, 0.5);
    let third_quartile  = statistics.quantile(scores, 0.75);

    let coords = [  this.getDiagonalline(scores, scores_coords, first_quartile,better, max_x, max_y),
                    this.getDiagonalline(scores, scores_coords, second_quartile,better, max_x, max_y),
                    this.getDiagonalline(scores, scores_coords, third_quartile,better, max_x, max_y)]


    // Create shapes
    const shapes = [];
    for (let i = 0; i < coords.length; i++) {
      let [x_coords, y_coords] = [coords[i][0], coords[i][1]];
      const shape = {
        type: 'line',
        x0: x_coords[0],
        y0: y_coords[0],
        x1: x_coords[1],
        y1: y_coords[1],
        line: {
          color: '#C0D4E8',
          width: 2,
          dash: 'dash'
        }
      };

      shapes.push(shape)
    }

    // Get Annotations
    let annotationDiagonal = this.asigneQuartileDiagonal(tools_not_hidden, first_quartile, second_quartile, third_quartile,better)

    // Diagonal Q. Table
    this.createTableDiagonal(tools_not_hidden)


    const layout = {
      shapes: this.showShapesDiagonal ? shapes : [],
      annotations: this.getOptimizationArrow(this.optimalview).concat(annotationDiagonal),
    };

    Plotly.relayout(this.$refs.chart, layout);
    },

    // Normalize data
    normalizeData (xValues, yValues){
      let maxX = Math.max.apply(null, xValues);
      let maxY = Math.max.apply(null, yValues);

      let xNorm = xValues.map(function(e) {  
        return e / maxX;
      });

      let yNorm = yValues.map(function(e) {  
        return e / maxY;
      });
      return [xNorm, yNorm];
    },

    // Get coordinates for line
    getDiagonalline (scores, scores_coords, quartile, better, max_x, max_y) {
      let target;
      for(let i = 0; i < scores.length; i++){
        if(scores[i] <= quartile){
          // When la longitud de las tools es menor de la esperada se ejecuta este condicional.
          if (i == 0){i = 1}
          
          target = [[scores_coords[scores[i - 1]][0], scores_coords[scores[i - 1]][1]],
                  [scores_coords[scores[i]][0], scores_coords[scores[i]][1]]];
          break;
        }
      }

      let half_point = [(target[0][0] + target[1][0]) /2, (target[0][1] + target[1][1]) / 2]

      // # draw the line depending on which is the optimal corner
      let x_coords;
      let y_coords;
      if (better == "bottom-right"){
        x_coords = [half_point[0] - 2*max_x, half_point[0] + 2*max_x];
        y_coords = [half_point[1] - 2*max_y, half_point[1] + 2*max_y];
      } else if (better == "top-right"){
        x_coords = [half_point[0] + 2*max_x, half_point[0] - 2*max_x];
        y_coords = [half_point[1] - 2*max_y, half_point[1] + 2*max_y];   
      } else if (better == "top-left"){
        x_coords = [half_point[0] + 2*max_x, half_point[0] - 2*max_x];
        y_coords = [half_point[1] + 2*max_y, half_point[1] - 2*max_y];   
      };

      return [x_coords, y_coords];
    },

    // Asigne the classification by Diagonal Quartile
    asigneQuartileDiagonal (dataTools, first_quartile, second_quartile, third_quartile, better) {
      
      let poly = [[],[],[],[]];
      dataTools.forEach(element => {
        if (better == 'top-left'){
          if (element.score <= first_quartile) {
            element.quartile = 4;
            poly[0].push([element[0], element[1]]);
          } else if (element.score <= second_quartile) {
            element.quartile = 3;
            poly[1].push([element[0], element[1]]);
          } else if (element.score <= third_quartile) {
            element.quartile = 2;
            poly[3].push([element[0], element[1]]);
          } else {
            element.quartile = 1;
            poly[2].push([element[0], element[1]]);
          }

        }else{
          if (element.score <= first_quartile) {
            element.quartile = 4;
            poly[0].push([element[0], element[1]]);
          } else if (element.score <= second_quartile) {
            element.quartile = 3;
            poly[1].push([element[0], element[1]]);
          } else if (element.score <= third_quartile) {
            element.quartile = 2;
            poly[2].push([element[0], element[1]]);
          } else {
            element.quartile = 1;
            poly[3].push([element[0], element[1]]);
          }
        }
          
        

      });

      let i = 4;
      let annotationDiagonal = []
      poly.forEach((group) => {
        let center = (this.getCentroid(group))
        const centroidX = center[0];
        const centroidY = center[1];
        
        let annotationD = {
          xref: 'x',
          yref: 'y',
          x: centroidX,
          xanchor: 'right',
          y: centroidY,
          yanchor: 'bottom',
          text: i,
          showarrow: false,
          font: {
            size: 30,
            color: '#5A88B5'
          }
        }
        
        annotationDiagonal.push(annotationD)
        i--;
      });
      return annotationDiagonal
    },

    // Get centroide by annotation
    getCentroid(coord){
      var center = coord.reduce(function (x,y) {
        return [x[0] + y[0]/coord.length, x[1] + y[1]/coord.length] 
      }, [0,0])
      return center;
    },

    // Create Table
    createTableDiagonal(visibleTool) {
      this.tableData = [];

      this.allToolID.forEach((tool) => {
        const toolName = tool;
        const visibleToolInfo = visibleTool.find(item => item[0] === this.xValues[this.allToolID.indexOf(tool)]);

        let quartile = 0;
        let label = '--';

        if (visibleToolInfo) {
          quartile = visibleToolInfo.quartile;
          label = quartile.toString();
        }

        this.tableData.push({ tool_id: toolName, cuartil: quartile, label: label });
      });
    },

    // ----------------------------------------------------------------
    // K-MEANS CLUSTERING
    // ----------------------------------------------------------------
    // Function to toggle the visibility of the Kmeans Clustering
    toggleKmeansVisibility () {
      // If optimization is null return.
      if (!this.optimalview){
        return;
      }

      const plot = document.getElementById('scatterPlot')
      if (plot && plot.data) {
        const numTraces = plot.data.length;

        // Reset visibilities. Hide the Square and Show the Kmeans
        this.showShapesSquare = false;
        this.showAnnotationSquare = false;
        this.viewSquare = false;
        this.viewDiagonal = false;
        this.showShapesKmeans = true;
        this.viewKmeans = true;

        // Update visibility of Points
        this.dataPoints.forEach(array => { array.hidden = false; });

        // Calculate Pareto Frontier
        const updatedVisibleTools = this.dataPoints.filter(tool => !tool.hidden);
        const direction = this.formatOptimalDisplay(this.optimalview);
        const newParetoPoints = pf.getParetoFrontier(updatedVisibleTools, { optimize: direction });
        const newTraces = { x: [newParetoPoints.map(point => point[0])], y: [newParetoPoints.map(point => point[1])] };

        // Update visibility of traces in legend
        const visibleArray = Array(numTraces).fill(true);
        const layout = {
          shapes: false ? this.shapes : [],
          annotations: this.getOptimizationArrow(this.optimalview)
        };
        Plotly.update(this.$refs.chart, newTraces, layout, 1);
        Plotly.update(this.$refs.chart, { visible: visibleArray });

        // Create shape clustering
        let better = this.optimalview
        this.createShapeClustering(this.dataPoints, this.toolID, better, this.allToolID);

      }else{
        console.error("The graph with id 'scatterPlot' has no data")
      } 

    },

    // Create visualization Kmeans Clustering
    createShapeClustering (dataPoints, toolIDVisible, better, allToolID) {
      clusterMaker.k(4);
      clusterMaker.iterations(500);
      clusterMaker.data(dataPoints);

      // Obtener los resultados de los clusters
      let results = clusterMaker.clusters();
      let sortedResults = JSON.parse(JSON.stringify(results));

      this.orderResultKMeans(sortedResults, better)

      const groupedDataPoints = this.assignGroupToDataPoints(dataPoints, sortedResults);
      this.createDataPointForTables(toolIDVisible, groupedDataPoints, allToolID)


      // Crear shapes basados en los clusters
      this.shapes = sortedResults.map((cluster) => {
        const xValues = cluster.points.map(point => point[0]);
        const yValues = cluster.points.map(point => point[1]);
        return {
          type: 'rect',
          xref: 'x',
          yref: 'y',
          x0: Math.min(...xValues),
          y0: Math.min(...yValues),
          x1: Math.max(...xValues),
          y1: Math.max(...yValues),
          opacity: 0.2,
          fillcolor: 'rgba(0, 72, 129, 183)',
          line: {
            color: '#2A6CAB',
          }
        };
      });

      // Crear annotations para los centroides de los clusters
      let count = 0;
      this.annotationKmeans = sortedResults.map((cluster) => {
        const centroidX = cluster.centroid[0];
        const centroidY = cluster.centroid[1];
        count++;

        return {
          xref: 'x',
          yref: 'y',
          x: centroidX,
          xanchor: 'right',
          y: centroidY,
          yanchor: 'bottom',
          text: count,
          showarrow: false,
          font: {
            size: 30,
            color: '#5A88B5'
          }
        };
      });

      const layout = {
        shapes: this.showShapesKmeans ? this.shapes : [],
        annotations: this.getOptimizationArrow(this.optimalview).concat(this.annotationKmeans),
      };
      Plotly.update(this.$refs.chart, {}, layout);

    },

    // Sorted Results K-means
    orderResultKMeans (sortedResults, better) {
      // normalize data to 0-1 range
      let centroids_x = []
      let centroids_y = []
      
      sortedResults.forEach((element) => {
        centroids_x.push(element.centroid[0])
        centroids_y.push(element.centroid[1])
      })

      let [x_norm, y_norm] = this.normalize_data(centroids_x, centroids_y)

      let scores = [];
      if (better == "top-right") {
        for (let i = 0; i < x_norm.length; i++) {
          let distance = x_norm[i] + y_norm[i];
          scores.push(distance);
          sortedResults[i]['score'] = distance;
        };

      } else if (better == "bottom-right") {
        for (let i = 0; i < x_norm.length; i++) {
          let distance = x_norm[i] + (1 - y_norm[i]);
          scores.push(distance);
          sortedResults[i]['score'] = distance;
        };
      } else if (better == "top-left") {
        for (let i = 0; i < x_norm.length; i++) {
          let distance = (1 - x_norm[i]) + y_norm[i];
          scores.push(distance);
          sortedResults[i]['score'] = distance;
        };
      };

      this.sortByKey(sortedResults, "score");
    },

    // Normalize data by Kmeans Clustering
    normalize_data (x_values, y_values) {
      let maxX = Math.max.apply(null, x_values);
      let maxY = Math.max.apply(null, y_values);

      let x_norm = x_values.map(function (e) {
        return e / maxX;
      });

      let y_norm = y_values.map(function (e) {
        return e / maxY;
      });
      return [x_norm, y_norm];
    },

    // Sorting keys
    sortByKey(array, key) {
      return array.sort(function (a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0)) * -1;
      });
    },

    // Assigning group for tools
    assignGroupToDataPoints (dataPoints, sortedResults) {
      const groupedDataPoints = [];
      for (let i = 0; i < dataPoints.length; i++) {
        const dataPoint = dataPoints[i];
        for (let j = 0; j < sortedResults.length; j++) {
          const group = sortedResults[j];
          // Verificar si el punto está en el grupo
          if (group.points.some(groupPoint => this.isEqual(groupPoint, dataPoint))) {
            groupedDataPoints.push([...dataPoint, j + 1]);
            break;
          }
        }
      }
      return groupedDataPoints;
    },

    // Función de utilidad para comparar dos puntos y verificar si son iguales
    isEqual (point1, point2) {
      return point1[0] === point2[0] && point1[1] === point2[1];
    },

    // Create data for Table
    createDataPointForTables (visibleTools, groupedDataPoints, allToolID) {
      this.tableData = [];
      allToolID.forEach((tool) => {
        const index = visibleTools.indexOf(tool);
        let cuartil = 0;
        let label = '--';
        if (index !== -1) {
          cuartil = groupedDataPoints[index][2];
          label = cuartil.toString();
        }

        this.tableData.push({ tool_id: tool, cuartil: cuartil, label: label });
      })
    },



    // ----------------------------------------------------------------
    // SCATTER PLOT VIEWS
    // ----------------------------------------------------------------
    // Toggle Visibility
    toggleView() {
      if (this.viewApplied) {
        this.optimalView();
      } else {
        this.resetView();
      }
    },
    // Optimal View (Optimal dimensions)
    optimalView() {
      const layout = {
        xaxis: {
          range: [this.optimalXaxis[0], this.optimalXaxis[1]],
          title: {
            text: this.visualizationData.x_axis,
            font: {
              family: 'Arial, sans-serif',
              size: 16,
              color: 'black',
              weight: 'bold',
            },
          }
        },
        yaxis: {
          range: [this.optimalYaxis[0], this.optimalYaxis[1]],
          title: {
            text: this.visualizationData.y_axis,
            font: {
              family: 'Arial, sans-serif',
              size: 16,
              color: 'black',
              weight: 'bold',
            },
          },
        },
      };
      Plotly.relayout(this.$refs.chart, layout);
      this.viewApplied = false; // Optimal view is applied
    },
    // Reset View (Real dimensions)
    resetView() {
      const layout = {
        xaxis: {
          range: [0, Math.max(...this.xValues) + (Math.min(...this.xValues) / 3)],
          title: {
            text: this.visualizationData.x_axis,
            font: {
              family: 'Arial, sans-serif',
              size: 16,
              color: 'black',
              weight: 'bold',
            },
          }
        },
        yaxis: {
          range: [0, Math.max(...this.yValues) + 0.05],
          title: {
            text: this.visualizationData.y_axis,
            font: {
              family: 'Arial, sans-serif',
              size: 16,
              color: 'black',
              weight: 'bold',
            },
          },
        }
      };
      Plotly.relayout(this.$refs.chart, layout);
      this.viewApplied = true;

    },


    // ----------------------------------------------------------------
    // LAYOUT CHART
    // ----------------------------------------------------------------
    // Color of the traces
    getColor() {
      const currentColor = this.markerColors[this.colorIndex];
      this.colorIndex = (this.colorIndex + 1) % this.markerColors.length;
      return currentColor;
    },
    // Symbol of the traces
    getSymbol() {
      const currentSymbol = this.symbols[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.symbols.length;
      return currentSymbol;
    },
    // This function creates the annotations for the optimization arrow
    // If optimization is null it returns an empty array
    getOptimizationArrow(optimization) {
      const arrowAnnotations = [];
      let arrowX, arrowY;
      let axAdjustment = 0;
      let ayAdjustment = 0;

      // If optimization create annotations for the arrow
      if (optimization){
        // Determine arrow position based on optimization
        switch (optimization) {
          case 'top-left':
            arrowX = 0;
            arrowY = 0.98;
            axAdjustment = 35;
            ayAdjustment = 30;
            break;

          case 'top-right':
            arrowX = 0.98;
            arrowY = 0.98;
            axAdjustment = -30;
            ayAdjustment = 35;
            break;

          case 'bottom-right':
            arrowX = 1;
            arrowY = 0;
            axAdjustment = -30;
            ayAdjustment = -30;
            break;

          default:
            // By default, place the arrow in the upper left corner
            arrowX = 0;
            arrowY = 0;
            axAdjustment = 30;
            ayAdjustment = -35;
        }

        // Crear la anotación para la flecha
        const arrowAnnotation = {
          x: arrowX,
          y: arrowY,
          xref: 'paper',
          yref: 'paper',
          text: 'Optimal corner',
          font: {
            color: '#6C757D'
          },
          showarrow: true,
          arrowhead: 3,
          ax: axAdjustment,
          ay: ayAdjustment,
          arrowsize: 1,
          arrowcolor: '#6C757D'
        };

        arrowAnnotations.push(arrowAnnotation);
        return arrowAnnotations;
      }else{
        return null;
      }
    },
    // Image Position
    getImagePosition(optimization) {
      const ImagePositions = [];

      let positionX, positionY;

      // Posicion contraria
      switch (optimization) {
        case 'top-left':
          positionX = 1
          positionY = 0
          break;
        case 'top-right':
          positionX = 0.1
          positionY = 0
          break;
        case 'bottom-left':
          positionX = 1
          positionY = 0.9
          break;
        case 'bottom-right':
          positionX = 0.1
          positionY = 0.8
          break;
        default:
          positionX = 0.1
          positionY = 0
          break;
      }

      const imagesPosition = {
        x: positionX,
        y: positionY,
        sizex: 0.1,
        sizey: 0.3,
        source: "/2018.OpenEBench.logo.Manual_page2.png",
        xref: "paper",
        yref: "paper",
        xanchor: "right",
        yanchor: "bottom",
        "opacity": 0,
      }

      ImagePositions.push(imagesPosition)

      return ImagePositions

    },


    // ----------------------------------------------------------------
    // FORMAT DATE
    // ----------------------------------------------------------------
    formatDateString(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },

    // DOWNLOAD
    // ----------------------------------------------------------------
    async downloadChart (format, datasetId) {

      const chart = document.getElementById('scatterPlot');
      chart.layout.images[0].opacity = 0.5;
      Plotly.relayout(this.$refs.chart, chart.layout);

      if (format === 'png') {
        if (this.viewSquare || this.viewKmeans || this.viewDiagonal) {
          const toDownloadDiv = document.getElementById('todownload');
          const downloadCanvas = await html2canvas(toDownloadDiv, {
            scrollX: 0,
            scrollY: 0,
            width: toDownloadDiv.offsetWidth,
            height: toDownloadDiv.offsetHeight,
          });
            const downloadImage = downloadCanvas.toDataURL(`image/${format}`);

            const link = document.createElement('a');
            link.href = downloadImage;
            link.download = `benchmarking_chart_${datasetId}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
          const options = { format, height: 700, width: 800 };
          Plotly.toImage(chart, options)
            .then((url) => {
              const link = document.createElement('a');
              link.href = url;
              link.download = `benchmarking_chart_${datasetId}.${format}`;
              link.click();
            })
            .catch((error) => {
              console.error(`Error downloading graphic as ${format}`, error);
            });
        }

      } else if (format === 'svg') {
        const options = { format, height: 700, width: 800 };
        Plotly.toImage(chart, options)
          .then((url) => {
            const link = document.createElement('a');
            link.href = url;
            link.download = `benchmarking_chart_${datasetId}.${format}`;
            link.click();
          })
          .catch((error) => {
              console.error(`Error downloading graphic as ${format}`, error);
          });

      } else if (format === 'pdf') {
        const pdf = new jsPDF();
        
        pdf.text('Benchmarking', 105, 10, null, null, 'center');

        // Get chart image as base64 data URI
        const chartImageURI = await Plotly.toImage(chart, { format: 'png' });
        const chartHeight = 130;
        const chartWidth = 170;

        pdf.addImage(chartImageURI, 'PNG', 10, 15, chartWidth, chartHeight, null, 'FAST', 0, null, 'center');

        if (this.viewSquare || this.viewKmeans || this.viewDiagonal) {
          const table = document.getElementById('benchmarkingTable');
          const downloadCanvas = await html2canvas(table, {
            scrollX: 0,
            scrollY: 0,
            width: table.offsetWidth,
            height: table.offsetHeight,
          });
          const tableImageURI = downloadCanvas.toDataURL(`image/png`);
          const tableHeight = 140;
          const tableWidth = 100;

          // Add 20 pixels to the vertical position for the second image
          const tableVerticalPosition = chartHeight + 10;
          pdf.addImage(tableImageURI, 'PNG', 10, 150, tableVerticalPosition, tableHeight, tableWidth, null, 'FAST', 0, null, 'center');
        }

        // Save the PDF
        pdf.save(`benchmarking_chart_${datasetId}.${format}`);

      } else if (format === 'json') {
        // Descargar como JSON
        const chartData = this.originalData // Obtener datos del gráfico
        console.log(chartData)
        const jsonData = JSON.stringify(chartData);

        const link = document.createElement('a');
        link.href = `data:text/json;charset=utf-8,${encodeURIComponent(jsonData)}`;
        link.download = `${datasetId}.json`;
        link.click();
      } else {
        console.error('Error downloading chart:', error);
      }

      chart.layout.images[0].opacity = 0;
      Plotly.relayout(this.$refs.chart, chart.layout);
    },
  },
  computed: {
    // Text for the View Button
    viewButtonText() {
      return this.viewApplied ? 'Optimal View' : 'Reset View';
    },
    // Text for the Classification Button
    classificationButtonText() {
      if (this.viewKmeans) {
        return 'K-Means Clustering';
      } else if (this.viewSquare) {
        return 'Square Quartiles';
      } else if (this.viewDiagonal){
        return 'Diagonal Quartiles';
      } else {
        return 'Classification'
      }
    },
    // ICONS
    icon() {
      switch (this.type) {
        case 'warning':
          return 'warning';
        case 'error':
          return 'error';
        case 'success':
          return 'check_circle';
        default:
          return 'info';
      }
    },

  }
};
</script>

<style scoped>

.butns {
  margin-bottom: 1.8rem;
  /* font-family: 'Roboto', sans-serif; */
}
.custom-height-button {
  color: black;
  height: 45px !important;
  min-height: 40px !important;
  line-height: 45px !important;
}

.theme--light.v-btn-toggle:not(.v-btn-toggle--group) .v-btn.v-btn {
  border-color: #6C757D !important;
  border-width: 2px !important;
}

.button-classification{
  width: 210px;
  font-size: 17px !important;
  text-transform: capitalize;
}
.button-resetView {
  width: 140px;
  font-size: 16px !important;
  text-transform: capitalize;
}

.button-download {
  width: 168px;
  font-size: 16px !important;
  text-transform: capitalize;
}
.menu-item:hover {
  background-color: #6c757d;
  cursor: pointer;
}
@media (max-width: 1200px) {
  .button-classification {
    width: 180px;
    font-size: 14px !important;
  }

  .button-resetView {
    width: 120px;
    font-size: 14px !important;
  }

  .button-download {
    width: 140px;
    font-size: 14px !important;
  }

  .custom-height-button {
    height: 35px !important;
    line-height: 35px !important;
  }
}

@media (max-width: 992px) {
  .button-classification {
    width: 150px;
    font-size: 12px !important;
  }

  .button-resetView {
    width: 100px;
    font-size: 12px !important;
  }

  .button-download {
    width: 120px;
    font-size: 12px !important;
  }

  .custom-height-button {
    height: 30px !important;
    line-height: 30px !important;
  }
}

@media (max-width: 768px) {
  .button-classification {
    width: 120px;
    font-size: 10px !important;
  }

  .button-resetView {
    width: 80px;
    font-size: 10px !important;
  }

  .button-download {
    width: 100px;
    font-size: 10px !important;
  }

  .custom-height-button {
    height: 25px !important;
    line-height: 25px !important;
  }
}

@media (max-width: 300px) {
  .button-classification,
  .button-resetView,
  .button-download {
    width: 100%;
    font-size: 8px !important;
  }

  .custom-height-button {
    height: 20px !important;
    line-height: 20px !important;
  }
}

/* Info table */

.custom-btn-toggle .v-btn:first-child {
  border-top-left-radius: 10px;
  border-bottom-left-radius: 10px;
}

.custom-btn-toggle .v-btn:last-child {
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px;
}

.info-table{
  margin-right: 15px;
  margin-top: 1rem;
}

/* Table data */
.custom-table {
  width: 100%;
  border-collapse: collapse;
}

.custom-table th{
background-color: #6c757d;
color: white;
font-size: 16px !important;
}

.custom-table td {
  border: 1px solid #e0e0e0;
  padding: 10px;
  text-align: center;
  font-size: 16px !important;
}

.custom-table .first-th {
  border-top-left-radius: 10px;
  border-bottom-left-radius: 10px;
}

.custom-table .last-td {
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px; 
}

/* Remove hover effect */
.custom-table tr:hover {
  background-color: inherit !important;
}


/* Tools Table */
.content-table{
  display: flex;
  justify-content: center;
}

.tools-table {
  width: 90%;
  border-collapse: collapse;
}

.tools-table th{
  background-color: #6c757d !important;
  color: white !important;
  text-align: left !important;
  font-size: 16px !important;
}

.tools-table td {
  border: 1px solid #e0e0e0;
  padding: 10px;
  font-size: 16px !important;
}

.tools-table .tools-th {
  width: 55%;
  /* border-top-left-radius: 10px; */
}

.tools-table .classify-th {
  width: 45%;
  /* border-top-right-radius: 10px; */
}

.toolColumn {
  cursor: pointer;
  position: relative;
}

.toolColumn .color-box {
  width: 20px;
  height: 100%;
  display: inline-block;
  position: absolute;
  left: 0px;
  top: 50%;
  transform: translateY(-50%);
  background-color: rgba(255, 255, 255, 0.5);
}

.toolColumn span {
  display: inline-block;
  margin-left: 25px;
  transition: transform 0.3s ease;
}

.toolColumn:hover span {
  transform: translateX(5px);
  font-style: italic;
  color: #0A58A2;
}
@media (max-width: 768px) {
  .toolHeader {
      width: 30%; /* Ajusta el ancho de la columna de herramientas */
  }

  .toolColumn span {
      margin-left: 15px; /* Restaura el margen a su valor original */
  }
}

.quartil-1 {
  background-color: rgb(237, 248, 233);
}

.quartil-2 {
  background-color: rgb(186, 228, 179);
}

.quartil-3 {
  background-color: rgb(116, 196, 118);
}

.quartil-4 {
  background-color: rgb(35, 139, 69);
}

.quartil-zero {
  background-color: rgba(237, 231, 231, 0.5);
}


/* Apply animation when table enters and leaves */

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease-in-out;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}

/* quartile-message */
.custom-alert-icon {
  cursor: pointer;
  float: right;
}

.quartile-message{
  width: 195px;
}
</style>
