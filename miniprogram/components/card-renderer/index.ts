import { createCardRendererComponentData } from './component-data';

const INITIAL_DATA = createCardRendererComponentData(undefined);

Component({
  properties: {
    model: {
      type: Object,
      value: null,
      observer(value: unknown) {
        this.setData(createCardRendererComponentData(value));
      },
    },
  },
  data: INITIAL_DATA,
});
