<!-- Toast组件 - 基于Naive UI NMessageProvider -->
<template>
  <!-- Naive UI的消息提供者组件 -->
  <NMessageProvider placement="top-right" container-style="position: fixed; top: 20px; right: 20px;">
    <slot />
  </NMessageProvider>
</template>

<script setup lang="ts">
import { NMessageProvider } from 'naive-ui'
</script>