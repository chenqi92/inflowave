/**
 * 保存查询对话框
 * 用于保存和编辑查询收藏
 */

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Switch,
} from '@/components/ui';
import { Save, Star, Tag, X } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import type { SavedQuery } from '@/types';

/**
 * 表单数据
 */
interface SaveQueryFormData {
  name: string;
  description?: string;
  query: string;
  database?: string;
  tags: string[];
  favorite: boolean;
}

/**
 * 对话框属性
 */
export interface SaveQueryDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 保存成功回调 */
  onSaved?: (query: SavedQuery) => void;
  /** 要编辑的查询（如果是编辑模式） */
  editingQuery?: SavedQuery | null;
  /** 默认查询语句 */
  defaultQuery?: string;
  /** 默认数据库 */
  defaultDatabase?: string;
  /** 可用数据库列表 */
  databases?: string[];
}

/**
 * 保存查询对话框
 */
export const SaveQueryDialog: React.FC<SaveQueryDialogProps> = ({
  open,
  onClose,
  onSaved,
  editingQuery,
  defaultQuery = '',
  defaultDatabase,
  databases = [],
}) => {
  const [tagInput, setTagInput] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<SaveQueryFormData>({
    defaultValues: {
      name: '',
      description: '',
      query: defaultQuery,
      database: defaultDatabase || '',
      tags: [],
      favorite: false,
    },
  });

  // 编辑模式时填充表单
  useEffect(() => {
    if (editingQuery) {
      form.reset({
        name: editingQuery.name,
        description: editingQuery.description || '',
        query: editingQuery.query,
        database: editingQuery.database || '',
        tags: editingQuery.tags || [],
        favorite: editingQuery.favorite || false,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        query: defaultQuery,
        database: defaultDatabase || '',
        tags: [],
        favorite: false,
      });
    }
  }, [editingQuery, defaultQuery, defaultDatabase, open]);

  // 添加标签
  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;

    const currentTags = form.getValues('tags');
    if (currentTags.includes(tag)) {
      showMessage.warning('标签已存在');
      return;
    }

    form.setValue('tags', [...currentTags, tag]);
    setTagInput('');
  };

  // 删除标签
  const handleRemoveTag = (tag: string) => {
    const currentTags = form.getValues('tags');
    form.setValue(
      'tags',
      currentTags.filter((t) => t !== tag)
    );
  };

  // 提交表单
  const handleSubmit = async (data: SaveQueryFormData) => {
    setSubmitting(true);
    try {
      if (editingQuery) {
        // 更新现有查询
        const updatedQuery: SavedQuery = {
          ...editingQuery,
          name: data.name,
          description: data.description,
          query: data.query,
          database: data.database,
          tags: data.tags,
          favorite: data.favorite,
          updatedAt: new Date(),
        };

        await safeTauriInvoke('update_saved_query', { query: updatedQuery });
        showMessage.success('查询已更新');
        if (onSaved) {
          onSaved(updatedQuery);
        }
      } else {
        // 创建新查询
        const newQuery: Partial<SavedQuery> = {
          name: data.name,
          description: data.description,
          query: data.query,
          database: data.database,
          tags: data.tags,
          favorite: data.favorite,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const savedQuery = await safeTauriInvoke<SavedQuery>('save_query', {
          query: newQuery,
        });
        showMessage.success('查询已保存');
        if (onSaved) {
          onSaved(savedQuery);
        }
      }

      onClose();
    } catch (error) {
      showMessage.error(`保存失败: ${error}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            {editingQuery ? '编辑查询' : '保存查询'}
          </DialogTitle>
          <DialogDescription>
            {editingQuery
              ? '修改查询的名称、描述和其他属性'
              : '保存查询以便日后快速访问'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* 查询名称 */}
            <FormField
              control={form.control}
              name="name"
              rules={{
                required: '请输入查询名称',
                minLength: { value: 2, message: '名称至少2个字符' },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>查询名称 *</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：用户活跃度统计" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 查询描述 */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="简要描述这个查询的用途..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>可选，帮助您记住查询的用途</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 查询语句 */}
            <FormField
              control={form.control}
              name="query"
              rules={{ required: '请输入查询语句' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>查询语句 *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="SELECT * FROM ..."
                      rows={6}
                      className="font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 数据库 */}
            <FormField
              control={form.control}
              name="database"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>数据库</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择数据库（可选）" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">不指定</SelectItem>
                      {databases.map((db) => (
                        <SelectItem key={db} value={db}>
                          {db}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>可选，指定查询关联的数据库</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 标签 */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>标签</FormLabel>
                  <div className="space-y-2">
                    {/* 标签输入 */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="添加标签..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddTag}
                        disabled={!tagInput.trim()}
                      >
                        <Tag className="w-4 h-4 mr-1" />
                        添加
                      </Button>
                    </div>

                    {/* 标签列表 */}
                    {field.value.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {field.value.map((tag) => (
                          <Badge key={tag} variant="secondary" className="gap-1">
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <FormDescription>添加标签以便分类和搜索</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 收藏 */}
            <FormField
              control={form.control}
              name="favorite"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      添加到收藏
                    </FormLabel>
                    <FormDescription>
                      收藏的查询会显示在收藏列表中
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* 操作按钮 */}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '保存中...' : editingQuery ? '更新' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SaveQueryDialog;

