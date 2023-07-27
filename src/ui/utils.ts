import * as vscode from 'vscode'
import { createCompletionItem } from '@vscode-use/utils'
import type { IComponent, IEvent, IProp, IPropItem, IUiCompletions } from '../types'

declare const global: {
  commonIntellisense: {
    copyDom: string
  }
}

export function propsReducer(map: IComponent[]): IUiCompletions {
  const result: IUiCompletions = {}

  return map.reduce((result: Record<string, any>, item: IComponent) => {
    const completionAttrs: vscode.CompletionItem[] = []
    const completionEvents: vscode.CompletionItem[] = []
    const genAttrCompletion = () => {
      const attrs = ['id', 'style', 'class', 'className']
      return attrs.map((item) => {
        return createCompletionItem({ content: item, snippet: `${item}="$1"`, type: 5 })
      })
    }
    completionAttrs.push(...genAttrCompletion())

    Object.keys(item.props!).forEach((key) => {
      const componentProps = (item.props as IProp)[key]
      let type = vscode.CompletionItemKind.Property
      if (typeof componentProps.value === 'string')
        componentProps.value = [componentProps.value]
      else
        type = vscode.CompletionItemKind.Enum

      const genPropsCompletion = (values: string[], propItem: IPropItem) => {
        return values.map((v: string) => {
          const documentation = new vscode.MarkdownString()
          documentation.isTrusted = true
          documentation.supportHtml = true
          const detail = []
          const { type: compType, description } = propItem
          if (propItem.default !== undefined && propItem.default !== '')
            detail.push(`### 默认值:    ***\`${propItem.default.toString().replace(/`/g, '')}\`***`)

          if (description)
            detail.push(`### 描述:    ***\`${description}\`***`)

          if (compType)
            detail.push(`### 类型:    ***\`${compType.replace(/`/g, '')}\`***`)
          documentation.appendMarkdown(detail.join('\n\n'))

          if (item.typeDetail) {
            const data = `*** 类型详情 ***:\n${Object.keys(item.typeDetail).reduce((result, key) => result += key[0] === '$'
              ? `\ntype ${key.slice(1).replace(/-(\w)/g, v => v.toUpperCase())} = \n${item.typeDetail[key].map((typeItem: any) => `${typeItem.name} /*${typeItem.description}*/`).join('\n| ')}\n\n`
              : `\ninterface ${key} {\n  ${item.typeDetail[key].map((typeItem: any) => `${typeItem.name}${typeItem.optional ? '?' : ''}: ${typeItem.type} /*${typeItem.description}${typeItem.default ? ` 默认值: ***${typeItem.default}***` : ''}*/`).join('\n  ')}\n}`, '')}`
            documentation.appendCodeblock(data, 'typescript')
          }

          if (item.link)
            documentation.appendMarkdown(`\n\n[文档地址](${item.link})`)

          if (compType && compType.includes('boolean') && propItem.default === 'false')
            return createCompletionItem({ content: key, documentation })

          return createCompletionItem({ content: `${key}="${v}"`, documentation, snippet: `${key}="$\{1:${v}\}$2"`, type, preselect: true, sortText: '1' })
        })
      }

      completionAttrs.push(...genPropsCompletion(componentProps.value, componentProps))
    })

    const genEventsCompletion = (events: IEvent[]) => {
      return events.map((events: IEvent) => {
        const detail = []
        let { name, description, params } = events

        if (description)
          detail.push(`### 描述:    ***\`${description}\`***`)

        if (params)
          detail.push(`### 参数:    ***\`${params}\`***`)
        name = name.replace(/-(\w)/g, (_: string, v: string) => v.toUpperCase())
        const snippet = `${name}="$\{1:on${name[0].toUpperCase()}${name.slice(1)}\}$2"`
        const documentation = new vscode.MarkdownString()
        documentation.isTrusted = true
        documentation.supportHtml = true
        documentation.appendMarkdown(detail.join('\n\n'))
        return createCompletionItem({ content: `${name}="on${name[0].toUpperCase()}${name.slice(1)}"`, snippet, documentation, type: vscode.CompletionItemKind.Event })
      })
    }

    if (item.events)
      completionEvents.push(...genEventsCompletion(item.events))

    result[item.name!] = { attrs: completionAttrs, events: completionEvents }
    return result
  }, result)
}

export function componentsReducer(map: string[][]): vscode.CompletionItem[] {
  return map.map(([content, detail, demo]) => {
    const documentation = new vscode.MarkdownString('', true)
    documentation.isTrusted = true
    documentation.supportHtml = true
    documentation.appendMarkdown(`###  ${detail} \n`)
    if (demo) {
      global.commonIntellisense.copyDom = demo
      const copyIcon = '<img width="12" height="12" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxnIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2UyOWNkMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSI+PHBhdGggZD0iTTIwLjk5OCAxMGMtLjAxMi0yLjE3NS0uMTA4LTMuMzUzLS44NzctNC4xMjFDMTkuMjQzIDUgMTcuODI4IDUgMTUgNWgtM2MtMi44MjggMC00LjI0MyAwLTUuMTIxLjg3OUM2IDYuNzU3IDYgOC4xNzIgNiAxMXY1YzAgMi44MjggMCA0LjI0My44NzkgNS4xMjFDNy43NTcgMjIgOS4xNzIgMjIgMTIgMjJoM2MyLjgyOCAwIDQuMjQzIDAgNS4xMjEtLjg3OUMyMSAyMC4yNDMgMjEgMTguODI4IDIxIDE2di0xIi8+PHBhdGggZD0iTTMgMTB2NmEzIDMgMCAwIDAgMyAzTTE4IDVhMyAzIDAgMCAwLTMtM2gtNEM3LjIyOSAyIDUuMzQzIDIgNC4xNzIgMy4xNzJDMy41MTggMy44MjUgMy4yMjkgNC43IDMuMTAyIDYiLz48L2c+PC9zdmc+" />'
      documentation.appendMarkdown('### 示例\n')
      documentation.appendCodeblock(demo, 'html')
      documentation.appendMarkdown(`\n<a href="command:intellisense.copyDemo">${copyIcon}</a>\n`)
    }
    return createCompletionItem({ content, snippet: `<${content}>$1</${content}>`, documentation, type: vscode.CompletionItemKind.TypeParameter })
  })
}
