<template>
  <v-row justify="center" align="center">
    <v-col>
      <LoaderWidgets v-if="this.fetchedData" :dataChart="this.fetchedData"></LoaderWidgets>
    </v-col>
  </v-row>
</template>
<script>
export default {
  name: 'IndexPage',
  data() {
    return {
      fetchedData: null,
    }
  },
  async mounted() {
    // Fetch your data
    const response = await fetch('./barplot_test.json');
    // const response = await fetch('./raw_data_OEBD00200002UK0.json');
    this.fetchedData = await response.json();
    // this.fetchDataAndRender(this.fetchedData)
  },
  methods: {
    async fetchDataAndRender(data) {
      // Sets charging status based on data presence
      this.loading = !data;
      let visualization = data.datalink.inline_data.visualization
      let type = visualization.type
      // Prepare the data to pass to the component
      this.preparedData = {
        _id: data._id,
        dates: data.dates,
        dataset_contact_ids: data.dataset_contact_ids,
        inline_data: {
          challenge_participants:[],
          visualization:{}
        }
      }
      // Prepare specific data for Plots
      if (type === 'bar-plot'){
        // Process challenge_participants data for BarPlot
        data.datalink.inline_data.challenge_participants.forEach(participant => {
          const preparedParticipant = {
            tool_id: participant.tool_id,
            metric_value: participant.metric_value,
            stderr: participant.stderr
          };
          this.preparedData.inline_data.challenge_participants.push(preparedParticipant);
        });
        // Process visualization data for BarPlot
        const visualization = data.datalink.inline_data.visualization;
        this.preparedData.inline_data.visualization = {
          metric: visualization.metric,
          type: visualization.type
        };
      }else if (type === '2D-plot'){
        // Process challenge_participants data for ScatterPlot
        data.datalink.inline_data.challenge_participants.forEach(participant => {
          const preparedParticipant = {
            tool_id: participant.tool_id,
            metric_x: participant.metric_x,
            stderr_x: participant.stderr_x,
            metric_y: participant.metric_y,
            stderr_y: participant.stderr_y
          };
          this.preparedData.inline_data.challenge_participants.push(preparedParticipant);
        });
        // Process visualization data for ScatterPlot
        const visualization = data.datalink.inline_data.visualization;
        // const metrics_names = await this.getMetricsNames(visualization.x_axis, visualization.y_axis);
        this.preparedData.inline_data.visualization = {
          type: visualization.type,
          x_axis: visualization.x_axis,
          y_axis: visualization.y_axis,
          optimization: visualization.optimization
        };
      }else{
        return null;
      }
      
      // Check the display type and set the corresponding status
      if (visualization && type) {
        this.visualizationType = type;
      }
    },
  },
}
</script>
