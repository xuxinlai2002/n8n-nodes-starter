declare module '@n8n_io/riot-tmpl' {
    export function tmpl(template: string, data?: any): string;
    export function tmpl(template: string, data?: any, options?: any): string;
    export type ReturnValue = any;
} 