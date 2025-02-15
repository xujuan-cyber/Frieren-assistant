<template>
  <div class="flex flex-col h-[calc(50vh-2rem)] lg:h-full">
    <div class="bg-gray-900/50 backdrop-blur-sm rounded-lg shadow-lg border border-purple-700/30 overflow-hidden flex flex-col h-full">
      <div class="p-3 sm:p-4 space-y-3 sm:space-y-4 flex flex-col flex-1">
        <slot></slot>
      </div>
    </div>
  </div>
</template> 