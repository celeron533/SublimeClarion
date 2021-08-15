'use strict';

// src/extension.ts

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
            {scheme: "file", language: "clarion"}, 
            new ClarionDocumentSymbolProvider()
        )
    );
}

class ClarionDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

    private format(cmd: string):string{
        return cmd.substr(1).toLowerCase().replace(/^\w/, c => c.toUpperCase())
    }

    public provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken): Promise<vscode.DocumentSymbol[]> 
        {
        return new Promise((resolve, reject) => 
        {
            let symbols: vscode.DocumentSymbol[] = [];
            let nodes = [symbols]

            let inside_member = false
            let inside_procedure = false
            let inside_routine = false

            const symbolkind_member = vscode.SymbolKind.Module
            const symbolkind_procedure = vscode.SymbolKind.Method
            const symbolkind_routine = vscode.SymbolKind.Property


            const member_match_exp = new RegExp("^\\s*member\\s*\\(\\s*'(?<filename>\\S+)'\\s*\\)","igm")
            let hasModuleName = false

            const procedure_match_exp = new RegExp("^(?<name>\\S+)\\s+procedure\\((?<args>.*)\\)(,(?<virtual>virtual))?","igm")
            const routine_match_exp = new RegExp("^(?<name>\\S+)\\s+routine","igm")


            for (var i = 0; i < document.lineCount; i++) {
                var line = document.lineAt(i);
                if (line.isEmptyOrWhitespace || line.text.startsWith("!"))
                    continue;

                //let tokens = line.text.split(" ");
                let tokens = line.text.split(/\s+/);

                if (!inside_member){
                    // "   MEMBER('UTL2.clw')                                     !App=UTL2"
                    const member_matches = [...line.text.matchAll(member_match_exp)]
                    if (member_matches.length > 0 && member_matches[0].length > 1){
                        let member_symbol = new vscode.DocumentSymbol(
                            member_matches[0][1],  // filename:"UTL2.clw"
                            "app",
                            symbolkind_member,
                            line.range,line.range
                        )

                        nodes[nodes.length-1].push(member_symbol)
                        nodes.push(member_symbol.children)
                        inside_member = true
                        continue;
                    }
                }

                // "Treat     procedure()"
                let procedure_matches = [...line.text.matchAll(procedure_match_exp)]
                if (procedure_matches.length > 0 && procedure_matches[0].length > 1){
                    let procedure_symbol = new vscode.DocumentSymbol(
                        procedure_matches[0][1],  // name:"Treat"
                        "procedure",
                        symbolkind_procedure,
                        line.range,line.range
                    )
                    if (procedure_matches[0].length > 2){ // has additional procedure arguments
                        procedure_symbol.name+="(...)"
                    }

                    if (inside_routine){
                        nodes.pop()
                        inside_routine = false
                    }
                    else if(inside_procedure){
                        nodes.pop()
                        inside_procedure = false
                        inside_routine = false
                    }
                    nodes[nodes.length-1].push(procedure_symbol)
                    nodes.push(procedure_symbol.children)
                    inside_procedure = true
                    continue;
                }

                // "LoadData    routine"
                let routine_matches = [...line.text.matchAll(routine_match_exp)]
                if ( routine_matches.length > 0 && routine_matches[0].length > 1){
                    let routine_symbol = new vscode.DocumentSymbol(
                        routine_matches[0][1],  // name:"LoadData"
                        "routine",
                        symbolkind_routine,
                        line.range,line.range
                    )

                    nodes[nodes.length-1].push(routine_symbol)
                    inside_routine = true
                    continue;
                }
            }

            resolve(symbols);
        });
    }
}