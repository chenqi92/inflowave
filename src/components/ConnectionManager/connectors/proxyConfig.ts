import { tConn as t } from '@/i18n';
import type { FormSection } from './types';

/**
 * 获取代理配置表单section
 * 所有connector都可以复用这个通用代理配置
 */
export function getProxyConfigSection(dbType: string): FormSection {
  // 根据数据库类型设置不同的提示信息
  let enableProxyHint = '';
  switch (dbType) {
    case 'object-storage':
      enableProxyHint = t('enableProxyHintObjectStorage');
      break;
    case 'iotdb':
      enableProxyHint = t('enableProxyHintIotdb');
      break;
    case 'influxdb':
      enableProxyHint = t('enableProxyHintInfluxdb');
      break;
    default:
      enableProxyHint = '启用后将通过代理服务器连接';
  }

  return {
    id: 'proxy',
    title: t('proxy_config'),
    fields: [
      {
        name: 'proxyEnabled',
        label: t('enableProxy'),
        type: 'switch',
        defaultValue: false,
        description: enableProxyHint
      },
      {
        name: 'proxyType',
        label: t('proxyType'),
        type: 'select',
        required: false,
        visible: (formData) => formData.proxyEnabled === true,
        defaultValue: 'http',
        options: [
          { value: 'http', label: 'HTTP' },
          { value: 'https', label: 'HTTPS' },
          { value: 'socks5', label: 'SOCKS5' }
        ],
        description: t('selectProxyType')
      },
      {
        name: 'proxyHost',
        label: t('proxyHost'),
        type: 'text',
        required: false,
        visible: (formData) => formData.proxyEnabled === true,
        placeholder: t('proxy_host_placeholder'),
        validation: (value: string, formData: any) => {
          if (formData.proxyEnabled && !value?.trim()) {
            return t('validation.proxy_host_required');
          }
        }
      },
      {
        name: 'proxyPort',
        label: t('proxyPort'),
        type: 'number',
        required: false,
        visible: (formData) => formData.proxyEnabled === true,
        min: 1,
        max: 65535,
        placeholder: t('proxy_port_placeholder'),
        validation: (value: number, formData: any) => {
          if (formData.proxyEnabled) {
            if (!value) {
              return t('validation.proxy_port_range');
            }
            if (value < 1 || value > 65535) {
              return t('validation.proxy_port_range');
            }
          }
        }
      },
      {
        name: 'proxyUsername',
        label: t('proxyUsername'),
        type: 'text',
        visible: (formData) => formData.proxyEnabled === true,
        placeholder: t('proxy_username_placeholder')
      },
      {
        name: 'proxyPassword',
        label: t('proxyPassword'),
        type: 'password',
        visible: (formData) => formData.proxyEnabled === true,
        placeholder: t('proxy_password_placeholder')
      }
    ]
  };
}
