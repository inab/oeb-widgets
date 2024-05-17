<template>
    <v-card>
      <v-card-title>Bar Plot</v-card-title>
      <v-card-text>
        <div ref="chart"></div>
      </v-card-text>
    </v-card>
  </template>
  
  <script>
  // Importación de Plotly
  import Plotly from 'plotly.js-dist';
  
  export default {
    name: 'BarPlot',
    props: {
      data: {
        type: Object,
        required: true
      }
    },
    mounted() {
      this.renderChart();
    },
    methods: {
      renderChart() {
      const plotData = [this.data]; // Asegúrate de que los datos estén en un array

      const layout = {
        title: 'Bar Plot',
        xaxis: {
          title: 'Categories'
        },
        yaxis: {
          title: 'Values'
        }
      };

      // Configurar el gráfico de barras
      Plotly.newPlot(this.$refs.chart, plotData, layout);
    }
    }
  };
  </script>
  
  <style scoped>
  /* Estilos específicos del componente */
  </style>
  