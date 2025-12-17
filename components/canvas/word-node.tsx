"use client"

import { memo, useState } from "react"
import { Handle, Position, NodeProps } from "@xyflow/react"
import { Loader2 } from "lucide-react"

interface WordData {
  word: string
  definition?: string
  similarity?: string
  expanded: boolean
  loading?: boolean
}

function WordNode({ data, selected }: NodeProps<WordData>) {
  const [showTooltip, setShowTooltip] = useState(false)

  const hasInfo = data.definition || data.similarity

  return (
    <div
      className={`
        relative px-4 py-2 rounded-xl border-2 shadow-md transition-all duration-200
        ${selected ? "border-primary shadow-lg scale-105" : "border-border"}
        ${data.expanded ? "bg-primary/5" : "bg-card"}
        ${data.loading ? "opacity-70" : ""}
        hover:shadow-lg hover:scale-105 cursor-pointer
      `}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* 连接点 */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-primary !w-2 !h-2 !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-primary !w-2 !h-2 !border-2 !border-background"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-primary !w-2 !h-2 !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-primary !w-2 !h-2 !border-2 !border-background"
      />

      {/* 单词内容 */}
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground text-sm whitespace-nowrap">
          {data.word}
        </span>
        {data.loading && (
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
        )}
      </div>

      {/* 已展开标记 */}
      {data.expanded && !data.loading && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background" />
      )}

      {/* 悬停提示 */}
      {showTooltip && hasInfo && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 
            bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-lg border border-border
            max-w-xs text-xs whitespace-normal animate-in fade-in-0 zoom-in-95"
        >
          {data.definition && (
            <div>
              <span className="text-blue-500 font-medium">释义：</span>
              <span>{data.definition}</span>
            </div>
          )}
          {data.similarity && (
            <div>
              <span className="text-orange-500 font-medium">相似：</span>
              <span>{data.similarity}</span>
            </div>
          )}
          {/* 小三角 */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 
            border-l-[6px] border-l-transparent 
            border-r-[6px] border-r-transparent 
            border-t-[6px] border-t-border" 
          />
        </div>
      )}
    </div>
  )
}

export default memo(WordNode)

