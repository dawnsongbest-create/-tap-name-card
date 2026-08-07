import type { PreparedCardViewModel } from '../../model';
import {
  createMagazinePresentation,
  createMagazineRuntimeState,
  isCurrentMagazineGalleryImageRequest,
  isCurrentMagazineIdentityImageRequest,
  markMagazineGalleryImageFailed,
  markMagazineIdentityImageFailed,
  type MagazineRuntimeState,
} from './presentation';

const EMPTY_PRESENTATION = createMagazinePresentation(null);
const EMPTY_RUNTIME_STATE = createMagazineRuntimeState(EMPTY_PRESENTATION);

interface MagazineImageErrorEvent {
  readonly currentTarget: {
    readonly dataset: {
      readonly figureKey?: unknown;
      readonly imageRef?: unknown;
    };
  };
}

interface MagazineIdentityImageErrorEvent {
  readonly currentTarget: {
    readonly dataset: {
      readonly imageRef?: unknown;
    };
  };
}

Component({
  properties: {
    model: {
      type: Object,
      value: null,
      observer(model) {
        const preparedModel = model ? (model as unknown as PreparedCardViewModel) : null;
        const presentation = createMagazinePresentation(preparedModel);

        this.setData({
          ...presentation,
          ...createMagazineRuntimeState(presentation),
        });
      },
    },
  },
  data: {
    ...EMPTY_PRESENTATION,
    ...EMPTY_RUNTIME_STATE,
  },
  methods: {
    onGalleryImageError(event: MagazineImageErrorEvent) {
      const figureKey = event.currentTarget.dataset.figureKey;
      const imageRef = event.currentTarget.dataset.imageRef;

      if (
        typeof figureKey !== 'string' ||
        typeof imageRef !== 'string' ||
        !isCurrentMagazineGalleryImageRequest(this.data, figureKey, imageRef)
      ) {
        return;
      }

      const runtimeState: MagazineRuntimeState = {
        primaryImageFailed: this.data.primaryImageFailed,
        secondaryFigures: this.data.secondaryFigures,
        allGalleryImagesFailed: this.data.allGalleryImagesFailed,
        showIdentityVisual: this.data.showIdentityVisual,
        identityImageFailed: this.data.identityImageFailed,
      };

      this.setData(markMagazineGalleryImageFailed(runtimeState, figureKey));
    },
    onIdentityVisualImageError(event: MagazineIdentityImageErrorEvent) {
      const imageRef = event.currentTarget.dataset.imageRef;

      if (
        typeof imageRef !== 'string' ||
        !isCurrentMagazineIdentityImageRequest(this.data, imageRef)
      ) {
        return;
      }

      const runtimeState: MagazineRuntimeState = {
        primaryImageFailed: this.data.primaryImageFailed,
        secondaryFigures: this.data.secondaryFigures,
        allGalleryImagesFailed: this.data.allGalleryImagesFailed,
        showIdentityVisual: this.data.showIdentityVisual,
        identityImageFailed: this.data.identityImageFailed,
      };

      this.setData(markMagazineIdentityImageFailed(runtimeState));
    },
  },
});
