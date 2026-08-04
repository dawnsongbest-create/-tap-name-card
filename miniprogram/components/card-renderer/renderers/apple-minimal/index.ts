import type { PreparedCardViewModel } from '../../model';
import { createAppleMinimalPresentation } from './presentation';

const EMPTY_PRESENTATION = createAppleMinimalPresentation(null);

Component({
  properties: {
    model: {
      type: Object,
      value: null,
      observer(model) {
        const preparedModel = model ? (model as unknown as PreparedCardViewModel) : null;

        this.setData({
          ...createAppleMinimalPresentation(preparedModel),
          imageLoadFailed: false,
        });
      },
    },
  },
  data: {
    ...EMPTY_PRESENTATION,
    imageLoadFailed: false,
  },
  methods: {
    onVisualImageError() {
      this.setData({
        hasVisual: false,
        imageLoadFailed: true,
      });
    },
  },
});
