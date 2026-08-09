import {
  buildTemplatePreviewUrl,
  getLaunchCatalog,
  resolveLaunchTemplate,
  type LaunchTemplateEntry,
} from '../../product/launch-templates';
import { getLaunchPreviewModel } from '../../product/launch-preview-models';
import type { RenderModel } from '../../templates/index';

interface GalleryEntryView {
  readonly templateId: LaunchTemplateEntry['templateId'];
  readonly templateVersion: LaunchTemplateEntry['templateVersion'];
  readonly display: LaunchTemplateEntry['display'];
  readonly previewModel: RenderModel;
}

interface GalleryTemplateEvent {
  readonly currentTarget: {
    readonly dataset: Readonly<Record<string, unknown>>;
  };
}

function createGalleryEntries(): readonly GalleryEntryView[] {
  const catalog = getLaunchCatalog();
  const entries = catalog.map((entry) => {
    const previewModel = getLaunchPreviewModel(entry.templateId);

    return previewModel
      ? {
          templateId: entry.templateId,
          templateVersion: entry.templateVersion,
          display: entry.display,
          previewModel,
        }
      : undefined;
  });

  return catalog.length === 2 && entries.every((entry): entry is GalleryEntryView => Boolean(entry))
    ? entries
    : [];
}

const galleryEntries = createGalleryEntries();

Page({
  data: {
    catalogState: galleryEntries.length === 2 ? 'READY' : 'EMPTY',
    entries: galleryEntries,
  },
  onPreviewTemplate(event: GalleryTemplateEvent) {
    const resolution = resolveLaunchTemplate(
      event.currentTarget.dataset.templateId,
      event.currentTarget.dataset.templateVersion,
    );

    if (resolution.status === 'failure') {
      return;
    }

    wx.navigateTo({
      url: buildTemplatePreviewUrl(resolution.entry),
    });
  },
});
