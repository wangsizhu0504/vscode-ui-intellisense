import type * as vscode from 'vscode'

export interface IComponent {
  name: string
  props?: IProp
  methods?: any[]
  events?: IEvent[]
  link: string
  typeDetail?: any
}
export interface IProp {
  [key: string]: IPropItem
}
export interface IPropItem {
  value: string | string[]
  description: string
  default: string
  type: string
}
export interface IEvent {
  name: string
  description: string
  params: string
}

export interface IUiCompletions {
  [key: string]: {
    attrs: vscode.CompletionItem[]
    events: vscode.CompletionItem[]
  }
}
export interface IPackage {
  name: string
  version: string
}
