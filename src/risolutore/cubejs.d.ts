declare module 'cubejs' {
  export default class Cube {
    cp: number[]
    co: number[]
    ep: number[]
    eo: number[]
    static fromString(facce: string): Cube
    static initSolver(): void
    asString(): string
    solveUpright(profonditaMassima?: number): string
  }
}
