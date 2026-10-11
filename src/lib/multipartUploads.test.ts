import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('./axios', () => ({ api: { post } }));

import { uploadFittingAsset } from './fittingRoomApi';
import { uploadMediaApi, uploadProductPhotoApi } from './mediaApi';
import { uploadMediaApi as uploadProfileMediaApi } from './profileApi';

describe('multipart uploads', () => {
  beforeEach(() => post.mockReset().mockResolvedValue({ data: {} }));

  it.each([
    ['product media', () => uploadMediaApi(new File(['image'], 'image.png', { type: 'image/png' })), '/media/upload'],
    ['product photo', () => uploadProductPhotoApi(new File(['image'], 'image.png', { type: 'image/png' })), '/media/upload?purpose=productPhoto'],
    ['profile media', () => uploadProfileMediaApi(new File(['image'], 'image.png', { type: 'image/png' })), '/media/upload'],
    ['fitting-room model', () => uploadFittingAsset('product-1', new File(['glb'], 'model.glb'), 'BASE_TOP'), '/api/v1/admin/products/product-1/fitting-room/assets'],
  ])('leaves the multipart boundary to the browser for %s', async (_label, upload, endpoint) => {
    await upload();

    expect(post).toHaveBeenCalledWith(endpoint, expect.any(FormData), expect.objectContaining({
      headers: { 'Content-Type': undefined },
    }));
  });
});
