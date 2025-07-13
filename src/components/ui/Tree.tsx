import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight, Folder, FolderOpen, File } from "lucide-react"

interface TreeNode {
  key: string
  title: React.ReactNode
  children?: TreeNode[]
  icon?: React.ReactNode
  disabled?: boolean
  disableCheckbox?: boolean
  selectable?: boolean
  isLeaf?: boolean
}

interface TreeProps {
  className?: string
  treeData?: TreeNode[]
  children?: React.ReactNode
  checkable?: boolean
  defaultExpandAll?: boolean
  defaultExpandedKeys?: string[]
  defaultSelectedKeys?: string[]
  defaultCheckedKeys?: string[]
  expandedKeys?: string[]
  selectedKeys?: string[]
  checkedKeys?: string[]
  onExpand?: (expandedKeys: string[], info: { expanded: boolean; node: TreeNode }) => void
  onSelect?: (selectedKeys: string[], info: { selected: boolean; node: TreeNode }) => void
  onCheck?: (checkedKeys: string[], info: { checked: boolean; node: TreeNode }) => void
  showIcon?: boolean
  showLine?: boolean
  blockNode?: boolean
}

const Tree = React.forwardRef<HTMLDivElement, TreeProps>(
  ({ 
    className,
    treeData = [],
    children,
    checkable = false,
    defaultExpandAll = false,
    defaultExpandedKeys = [],
    defaultSelectedKeys = [],
    defaultCheckedKeys = [],
    expandedKeys,
    selectedKeys,
    checkedKeys,
    onExpand,
    onSelect,
    onCheck,
    showIcon = false,
    showLine = false,
    blockNode = false,
    ...props 
  }, ref) => {
    const [internalExpandedKeys, setInternalExpandedKeys] = React.useState<string[]>(() => {
      if (defaultExpandAll) {
        const getAllKeys = (nodes: TreeNode[]): string[] => {
          const keys: string[] = []
          const traverse = (items: TreeNode[]) => {
            items.forEach(item => {
              if (item.children && item.children.length > 0) {
                keys.push(item.key)
                traverse(item.children)
              }
            })
          }
          traverse(nodes)
          return keys
        }
        return getAllKeys(treeData)
      }
      return defaultExpandedKeys
    })

    const [internalSelectedKeys, setInternalSelectedKeys] = React.useState<string[]>(defaultSelectedKeys)
    const [internalCheckedKeys, setInternalCheckedKeys] = React.useState<string[]>(defaultCheckedKeys)

    const actualExpandedKeys = expandedKeys !== undefined ? expandedKeys : internalExpandedKeys
    const actualSelectedKeys = selectedKeys !== undefined ? selectedKeys : internalSelectedKeys
    const actualCheckedKeys = checkedKeys !== undefined ? checkedKeys : internalCheckedKeys

    const handleExpand = (key: string, node: TreeNode) => {
      const expanded = !actualExpandedKeys.includes(key)
      const newExpandedKeys = expanded 
        ? [...actualExpandedKeys, key]
        : actualExpandedKeys.filter(k => k !== key)

      if (expandedKeys === undefined) {
        setInternalExpandedKeys(newExpandedKeys)
      }
      onExpand?.(newExpandedKeys, { expanded, node })
    }

    const handleSelect = (key: string, node: TreeNode) => {
      if (node.disabled || node.selectable === false) return

      const selected = !actualSelectedKeys.includes(key)
      const newSelectedKeys = selected ? [key] : []

      if (selectedKeys === undefined) {
        setInternalSelectedKeys(newSelectedKeys)
      }
      onSelect?.(newSelectedKeys, { selected, node })
    }

    const handleCheck = (key: string, node: TreeNode) => {
      if (node.disabled || node.disableCheckbox) return

      const checked = !actualCheckedKeys.includes(key)
      const newCheckedKeys = checked
        ? [...actualCheckedKeys, key]
        : actualCheckedKeys.filter(k => k !== key)

      if (checkedKeys === undefined) {
        setInternalCheckedKeys(newCheckedKeys)
      }
      onCheck?.(newCheckedKeys, { checked, node })
    }

    const getNodeIcon = (node: TreeNode, expanded: boolean) => {
      if (node.icon) return node.icon
      if (!showIcon) return null
      
      if (node.children && node.children.length > 0) {
        return expanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />
      }
      return <File className="h-4 w-4" />
    }

    const renderNode = (node: TreeNode, level = 0): React.ReactNode => {
      const hasChildren = node.children && node.children.length > 0
      const isExpanded = actualExpandedKeys.includes(node.key)
      const isSelected = actualSelectedKeys.includes(node.key)
      const isChecked = actualCheckedKeys.includes(node.key)

      return (
        <div key={node.key} className="select-none">
          <div
            className={cn(
              "flex items-center py-1 px-2 rounded cursor-pointer transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              isSelected && "bg-accent text-accent-foreground",
              node.disabled && "opacity-50 cursor-not-allowed",
              blockNode && "block w-full"
            )}
            style={{ paddingLeft: `${level * 20 + 8}px` }}
          >
            {/* 展开/折叠图标 */}
            <div className="flex items-center justify-center w-4 h-4 mr-1">
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleExpand(node.key, node)
                  }}
                  className="p-0 border-none bg-transparent cursor-pointer"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              ) : showLine ? (
                <div className="w-3 h-3 border-l border-b border-border" />
              ) : null}
            </div>

            {/* 复选框 */}
            {checkable && (
              <input
                type="checkbox"
                checked={isChecked}
                disabled={node.disabled || node.disableCheckbox}
                onChange={() => handleCheck(node.key, node)}
                onClick={(e) => e.stopPropagation()}
                className="mr-2"
              />
            )}

            {/* 图标 */}
            {getNodeIcon(node, isExpanded) && (
              <span className="mr-2 text-muted-foreground">
                {getNodeIcon(node, isExpanded)}
              </span>
            )}

            {/* 标题 */}
            <span
              className="flex-1 text-sm"
              onClick={() => handleSelect(node.key, node)}
            >
              {node.title}
            </span>
          </div>

          {/* 子节点 */}
          {hasChildren && isExpanded && (
            <div>
              {node.children!.map(child => renderNode(child, level + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          "text-sm",
          showLine && "border-l border-border ml-2",
          className
        )}
        {...props}
      >
        {treeData.map(node => renderNode(node))}
        {children}
      </div>
    )
  }
)
Tree.displayName = "Tree"

export { Tree }
export type { TreeProps, TreeNode }