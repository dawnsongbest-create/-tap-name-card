import { emitPageStateRetryIntent, getPageStateViewModel, type PageStateViewModel } from './model';

Component({
  properties: {
    kind: {
      type: String,
      value: 'loading',
      observer(value: string) {
        this.setData({
          viewModel: getPageStateViewModel(value),
        });
      },
    },
    title: {
      type: String,
      value: '',
    },
    message: {
      type: String,
      value: '',
    },
    retryLabel: {
      type: String,
      value: '重试',
    },
  },
  data: {
    viewModel: getPageStateViewModel('loading') as PageStateViewModel,
  },
  methods: {
    onRetry() {
      emitPageStateRetryIntent((eventName) => this.triggerEvent(eventName));
    },
  },
});
