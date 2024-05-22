<template>
    <div v-if="visible" class="custom-alert">
    <div class="custom-alert-icon-container">
      <i class="material-icons custom-alert-icon">{{ icon }}</i>
    </div>
    <div class="custom-alert-content">
      <strong class="custom-alert-title">{{ title }}</strong>
      <p>{{ message }}</p>
    </div>
    <button @click="closeAlert">&times;</button>
  </div>
  </template>
  
  <script>
  export default {
    name: "CustomAlert",
    props: {
      title: {
        type: String,
        default: 'Warning'
      },
      message: {
        type: String,
        required: true
      },
      type: {
        type: String,
        default: 'warning'
      },
      autoCloseDelay: {
        type: Number,
        default: 0 ,
        autoCloseDelay: {
            type: Number,
            default: 0 ,
        }
      }
    },
    data() {
      return {
        visible: true,
        dismissCountDown: this.autoCloseDelay / 1000,
      };
    },
    computed: {
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
    }
  },
    methods: {
        closeAlert() {
            this.visible = false;
        },
        startAutoCloseTimer() {
            if (this.autoCloseDelay > 0) {
                setTimeout(this.decrementCountDown, 1000);
            }
        },
        decrementCountDown() {
            if (this.dismissCountDown > 0) {
                this.dismissCountDown -= 1;
                setTimeout(this.decrementCountDown, 1000);
            } else {
                this.closeAlert();
            }
        }
    },
    mounted() {
    this.startAutoCloseTimer();
  }
  };
</script>
  
<style scoped>
.custom-alert {
  display: flex;
  align-items: center;
  padding: 20px;
  background-color: #FDEFE4; /* Color de advertencia */
  color: #F37C21; /* Color del texto */
  border-radius: 5px;
  position: relative;
  margin: 20px 0;
}

.custom-alert-icon-container {
  margin-right: 15px; /* Espacio entre el icono y el texto */
}

.custom-alert-content {
  flex-grow: 1; /* Ocupa todo el espacio restante */
}

.custom-alert-title {
  font-weight: bold;
  margin-bottom: 10px;
}

.custom-alert button {
  background: none;
  border: none;
  font-size: 25px;
  cursor: pointer;
}
  </style>
  