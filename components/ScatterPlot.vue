<template>
  <v-card>
    <v-card-title>Scatter Plot</v-card-title>
    <v-card-text>
      <div ref="chart"></div>
    </v-card-text>
  </v-card>
</template>

<script>
// Importación de Plotly
import Plotly from 'plotly.js-dist';

export default {
  name: 'ScatterPlot',
  props: {
    data: {
      type: Object,
      required: true
    }
  },
  mounted() {
    // Renderizar el scatter plot cuando el componente se monta
    this.renderChart();
  },
  methods: {
    renderChart() {
      // Configurar el scatter plot
      Plotly.newPlot(this.$refs.chart, this.data, {});
    }
  }
};
</script>

<style scoped>
/* Estilos específicos del componente */
</style>
