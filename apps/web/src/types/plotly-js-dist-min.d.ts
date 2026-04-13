declare module "plotly.js-dist-min" {
  interface PlotlyInstance {
    newPlot: (
      root: HTMLElement,
      data: unknown[],
      layout?: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<unknown>;
    purge: (root: HTMLElement) => void;
  }

  const Plotly: PlotlyInstance;
  export default Plotly;
}
