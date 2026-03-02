<template>
  <template v-if="node.kind === 'element'">
    <details v-if="hasChildren" class="xml-details" :open="isOpenByDefault">
      <summary class="xml-summary" :style="lineStyle">
        <span class="xml-punct">&lt;</span>
        <span class="xml-tag">{{ node.name }}</span>
        <template v-for="attribute in node.attributes" :key="`${node.name || 'node'}:${attribute.name}`">
          <span class="xml-attr-space"> </span>
          <span class="xml-attr-name">{{ attribute.name }}</span>
          <span class="xml-punct">=</span>
          <span class="xml-attr-value">"{{ attribute.value }}"</span>
        </template>
        <span class="xml-punct">&gt;</span>
      </summary>

      <XmlTreeNode
        v-for="(child, childIndex) in node.children"
        :key="buildChildKey(child, childIndex)"
        :node="child"
        :depth="depth + 1"
        :default-expanded-depth="defaultExpandedDepth"
      />

      <div class="xml-line xml-closing" :style="lineStyle">
        <span class="xml-punct">&lt;/</span>
        <span class="xml-tag">{{ node.name }}</span>
        <span class="xml-punct">&gt;</span>
      </div>
    </details>

    <div v-else class="xml-line" :style="lineStyle">
      <span class="xml-punct">&lt;</span>
      <span class="xml-tag">{{ node.name }}</span>
      <template v-for="attribute in node.attributes" :key="`${node.name || 'node'}:${attribute.name}`">
        <span class="xml-attr-space"> </span>
        <span class="xml-attr-name">{{ attribute.name }}</span>
        <span class="xml-punct">=</span>
        <span class="xml-attr-value">"{{ attribute.value }}"</span>
      </template>
      <span class="xml-punct"> /&gt;</span>
    </div>
  </template>

  <div v-else-if="node.kind === 'text'" class="xml-line xml-text-node" :style="lineStyle">
    {{ node.value }}
  </div>

  <div v-else-if="node.kind === 'comment'" class="xml-line xml-comment" :style="lineStyle">
    &lt;!-- {{ node.value }} --&gt;
  </div>

  <div v-else-if="node.kind === 'cdata'" class="xml-line xml-cdata" :style="lineStyle">
    &lt;![CDATA[{{ node.value }}]]&gt;
  </div>

  <div v-else-if="node.kind === 'processing'" class="xml-line xml-processing" :style="lineStyle">
    &lt;?{{ node.name }} {{ node.value }}?&gt;
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { XmlNodeModel } from '../../types/xml-renderer'

defineOptions({
  name: 'XmlTreeNode',
})

const props = withDefaults(
  defineProps<{
    node: XmlNodeModel
    depth: number
    defaultExpandedDepth?: number
  }>(),
  {
    defaultExpandedDepth: 1,
  },
)

const hasChildren = computed(
  () => props.node.kind === 'element' && Array.isArray(props.node.children) && props.node.children.length > 0,
)

const isOpenByDefault = computed(() => props.depth < props.defaultExpandedDepth)

const lineStyle = computed(() => ({
  paddingLeft: `${props.depth * 16}px`,
}))

const buildChildKey = (child: XmlNodeModel, index: number): string => {
  if (child.kind === 'element' && child.name) {
    return `${child.kind}:${child.name}:${index}`
  }
  if (child.kind === 'processing' && child.name) {
    return `${child.kind}:${child.name}:${index}`
  }
  return `${child.kind}:${index}`
}
</script>

<style scoped>
.xml-details {
  margin: 0;
  padding: 0;
}

.xml-summary,
.xml-line {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: inherit;
  white-space: pre-wrap;
  word-break: break-word;
}

.xml-summary {
  cursor: pointer;
  user-select: none;
}

.xml-summary:hover {
  background-color: rgba(24, 160, 88, 0.08);
}

.xml-punct {
  color: rgba(100, 116, 139, 0.95);
}

.xml-tag {
  color: #0f766e;
  font-weight: 600;
}

.xml-attr-name {
  color: #2563eb;
}

.xml-attr-value {
  color: #9333ea;
}

.xml-text-node {
  color: #334155;
}

.xml-comment {
  color: #64748b;
  font-style: italic;
}

.xml-cdata,
.xml-processing {
  color: #475569;
}
</style>
