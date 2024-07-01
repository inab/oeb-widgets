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
                <v-btn outlined v-bind="attrs" v-on="on" class="button-classification custom-height-button">
                  {{classificationButtonText}}
                </v-btn>
              </template>
              <v-list>
                <v-list-item class="menu-item"  @click="noClassification"
                :class="{ 'disabled-class': classificationDisabled }"
                :disabled="classificationDisabled">
                  <v-list-item-title>No Classification</v-list-item-title>
                </v-list-item >
                <v-list-item class="menu-item" @click="toggleQuartilesVisibility" v-if="challenge_participants" 
                  :class="{ 'disabled-class': classificationDisabled }"
                  :disabled="classificationDisabled" >
                  <v-list-item-title>Square Quartiles</v-list-item-title>
                </v-list-item>
                <v-list-item class="menu-item" @click="toggleDiagonalQuartile"
                  v-if="challenge_participants" 
                  :class="{ 'disabled-class': classificationDisabled }"
                  :disabled="classificationDisabled" >
                  <v-list-item-title>Diagonal Quartiles</v-list-item-title>
                </v-list-item>
                <v-list-item class="menu-item" @click="toggleKmeansVisibility"
                  v-if="challenge_participants" 
                  :class="{ 'disabled-class': classificationDisabled }"
                  :disabled="classificationDisabled" >
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
                  <v-list-item-title>SVG (only plot)</v-list-item-title>
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
          <v-simple-table class="tools-table" height="800px" fixed-header v-if="tableData.length > 0" id="benchmarkingTable">
            <thead>
              <tr>
                <th class="tools-th">Participants</th>
                <th class="classify-th">{{ viewKmeans ? 'Clusters' : 'Quartile' }}
                  <v-tooltip :key="viewSquare" bottom>
                    <template v-slot:activator="{ on, attrs }">
                      <i
                        class="material-icons custom-alert-icon"
                        v-if="viewSquare"
                        v-bind="attrs"
                        v-on="on"
                      >
                        {{ icon }}
                      </i>
                    </template>
                    <div class="quartile-message">
                      <p><b>The Square quartile label</b></p>
                      <p>
                        Quartiles 2 and 3 are 'Mid (M)', representing average rankings, while 'Top (T)' 
                        denotes quartiles above average and 'Bottom (B)' those below, offering clarity in ranking.
                      </p>
                    </div>
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
import 'jspdf-autotable';

// REQUIREMENTS
var clusterMaker = require('clusters');
const pf = require('pareto-frontier');
const html2canvas = require('html2canvas');
const { jsPDF } = require('jspdf');

const imgLogo = 'data:image/png;base64,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';

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
      classificationDisabled: false,
      datasetId: null,
      datasetModDate: null,
      visualizationData: null,
      optimalview: null,
      challenge_participants: null,
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
      this.optimalview = data.visualization.optimization !== undefined ? data.visualization.optimization : null;
      this.challenge_participants = data.challenge_participants
    
      // Toggle classification button
      this.classificationDisabled = this.toggleClassification(this.optimalview, this.challenge_participants)

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
        height: 800,
        annotations: this.getOptimizationArrow(this.optimalview),
        xaxis: {
          title: {
            text: this.visualizationData.x_axis,
            font: {
              family: 'Arial, sans-serif',
              size: 18,
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
              size: 18,
              color: 'black',
              weight: 'bold',
            },
          },
        },
        margin: { l: 60, r: 30, t: 0, b: 10, pad: 4 },
        legend: {
          orientation: 'h',
          x: 0,
          y: -0.2,
          xref: 'paper',
          yref: 'paper',
          font: {
            size: 18,
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

    // ----------------------------------------------------------------
    // TOGGLE CLASSIFICATIONS
    // ----------------------------------------------------------------
    toggleClassification(optimalview, challenge_participants ){
      return optimalview === null || challenge_participants.length < 4;
    },

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
          
          // If the pareto returns only one point, we create two extra points to represent it.
          if (newParetoPoints.length == 1) {
            const extraPoint = [newParetoPoints[0][0], 0];
            const extraPoint2 = [Math.max(...this.xValues), newParetoPoints[0][1]];
            newParetoPoints.unshift(extraPoint);
            newParetoPoints.push(extraPoint2);
          }

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
            poly[0].push([element[0], element[1], element.quartile]);
          } else if (element.score <= second_quartile) {
            element.quartile = 3;
            poly[1].push([element[0], element[1], element.quartile]);
          } else if (element.score <= third_quartile) {
            element.quartile = 2;
            poly[3].push([element[0], element[1], element.quartile]);
          } else {
            element.quartile = 1;
            poly[2].push([element[0], element[1], element.quartile]);
          }

        }else{
          if (element.score <= first_quartile) {
            element.quartile = 4;
            poly[0].push([element[0], element[1], element.quartile]);
          } else if (element.score <= second_quartile) {
            element.quartile = 3;
            poly[1].push([element[0], element[1], element.quartile]);
          } else if (element.score <= third_quartile) {
            element.quartile = 2;
            poly[2].push([element[0], element[1], element.quartile]);
          } else {
            element.quartile = 1;
            poly[3].push([element[0], element[1], element.quartile]);
          }
        }
        
      });

      let annotationDiagonal = []
      poly.forEach((group) => {
        let center = (this.getCentroid(group))
        const centroidX = center[0];
        const centroidY = center[1];
        const quartile = group[0][2];        
      
        let annotationD = {
          xref: 'x',
          yref: 'y',
          x: centroidX,
          xanchor: 'right',
          y: centroidY,
          yanchor: 'bottom',
          text: quartile,
          showarrow: false,
          font: {
            size: 30,
            color: '#5A88B5'
          }
        }
        
        annotationDiagonal.push(annotationD)
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
              size: 18,
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
              size: 18,
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
              size: 18,
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
              size: 18,
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
        source: imgLogo,
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

          const table = document.getElementById('benchmarkingTable');
          const innerDiv = table.querySelector('div[style*="height"]');
          const originalHeight = innerDiv.style.height;

          // Remove the height style
          innerDiv.style.height = '';

          const downloadCanvas = await html2canvas(toDownloadDiv, {
            scrollX: 0,
            scrollY: 0,
            width: toDownloadDiv.offsetWidth,
            height: toDownloadDiv.offsetHeight,
          });

          // Restore the height style
          innerDiv.style.height = originalHeight;

          const downloadImage = downloadCanvas.toDataURL(`image/${format}`);

          const link = document.createElement('a');
          link.href = downloadImage;
          link.download = `benchmarking_chart_${datasetId}.${format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          const toDownloadDiv =  document.getElementById('scatterPlot');
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

        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text(`Benchmarking Results of ${this.datasetId} at ${this.formatDateString(this.datasetModDate)}`, 105, 10, null, null, 'center');

        // Get chart image as base64 data URI
        const chartImageURI = await Plotly.toImage(document.getElementById('scatterPlot'), { format: 'png', width: 750, height: 600 });
        pdf.addImage(chartImageURI, 'PNG', 10, 20);

        if (this.viewSquare || this.viewKmeans || this.viewDiagonal) {
          const columns = ["Participants", this.viewKmeans ? "Clusters" : "Quartile"];
          
          // Extract data from quartileDataArray
          const rows = this.tableData.map(q => [q.tool_id, q.label,]);
          const quantileNumber = this.tableData.map(q => q.cuartil);
          const markerColors = ['#D62728', '#FF7F0E', '#8C564B', '#E377C2', '#4981B6', '#BCBD22', '#9467BD', '#0C9E7B', '#7F7F7F', '#31B8BD', '#FB8072', '#62D353']


          // Generate autoTable with custom styles
          pdf.autoTable({
              head: [columns],
              body: rows,
              startY: 190,
              theme: 'grid',
              tableWidth: 'auto',
              styles: {
                cellPadding: 1,
                fontSize: 8,
                overflow: 'linebreak',
                halign: 'left',
              },
              headStyles: {
                fillColor: [108, 117, 125]
              },
              willDrawCell: function (data) {

                if (data.row.section === 'body') {
                  // Check if the column header matches 'Quartile'
                  if (data.column.dataKey === 1) {
                    // Access the raw value of the cell
                    const rowIndex = data.row.index;
                    const quartileValue = quantileNumber[rowIndex];
                   // Set fill color based on quartile value
                   if (quartileValue === 1) {
                      pdf.setFillColor(237, 248, 233)
                    } else if (quartileValue === 2) {
                      pdf.setFillColor(186, 228, 179)
                    } else if (quartileValue === 3) {
                      pdf.setFillColor(116, 196, 118)
                    } else if (quartileValue === 4) {
                      pdf.setFillColor(35, 139, 69)
                    }
                  }else if (data.column.dataKey === 0) {
                    // Draw colored "div" in Tool column
                    const rowIndex = data.row.index;
                    const color = markerColors[rowIndex % markerColors.length];
                    pdf.setFillColor(color);

                    // Dibuja el rectángulo coloreado
                    pdf.rect(data.cell.x -2, data.cell.y, 10, data.cell.height, 'F');
                    // Restaura el color de relleno original
                    pdf.setFillColor(255, 255, 255);

                  }

                } 
              },
            });
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
  margin-right: 30px;
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
  /* padding: 10px; */
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
  width: 100%;
  border-collapse: collapse;
  margin-left: 20px;
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
  width: 60%;
  /* border-top-left-radius: 10px; */
}

.tools-table .classify-th {
  width: 40%;
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
