import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './index.css'

const { defaultAlgorithm } = theme

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: defaultAlgorithm,
        token: {
          colorPrimary: '#1a1a1a',
          colorBgContainer: '#ffffff',
          colorBorder: '#e8e8e6',
          borderRadius: 10,
          fontSize: 14,
          colorText: '#0a0a0a',
          colorTextSecondary: '#525252',
        },
        components: {
          Layout: {
            headerBg: '#ffffff',
            bodyBg: '#f4f4f2',
            footerBg: '#f4f4f2',
          },
          Menu: {
            darkItemBg: '#0f0f0f',
            darkItemSelectedBg: '#1a1a1a',
            darkItemHoverBg: '#171717',
            itemMarginInline: 8,
            itemBorderRadius: 8,
          },
          Card: {
            borderRadiusLG: 16,
          },
          Table: {
            headerBg: '#fafaf8',
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)
