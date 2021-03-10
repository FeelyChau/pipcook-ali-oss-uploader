/**
 * @file For plugin to collect test classification data
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import * as URL from 'url';
import AliOSS from 'ali-oss';
// import { DataSourceApi, downloadAndExtractTo } from '@pipcook/pipcook-core';

/**
 * the type for artifact plugin export
 */
export interface ArtifactExports {
  /**
   * `initialize` is called before the pipeline start,
   * plugin can do initialization here, something like environment checking,
   * login to the server, etc. The options are defined in the pipeline metadata, like:
   * {
   *   artifacts:[{
   *     processor: 'server-uploader',
   *     options: {
   *       targetUrl: 'http://os.alibaba.com/pipcook/model/'
   *     }
   *   }]
   * }
   * @param options the options for the plugin
   */
  initialize(options: Record<string, any>): Promise<void>;
  /**
   * After the model being trained successfully, the function `build` will
   * be called with the model directory and options.
   * @param options the options for the plugin
   */
  build(modelDir: string, options: Record<string, any>): Promise<void>;
}
let client: AliOSS;
let ossUrl: URL.UrlWithStringQuery;

export default {
  initialize: async (options: Record<string, any>): Promise<void> => {
    ossUrl = URL.parse(options.target);
    if (ossUrl.protocol !== 'oss:') {
      throw new TypeError(`Protocol not supported: ${ossUrl.protocol}`);
    }
    client = new AliOSS({
      accessKeyId: process.env.accessKeyId,
      accessKeySecret: process.env.accessKeySecret,
      bucket: ossUrl.host
    });
    try {
      await client.list(null, {});
    } catch (err) {
      throw new TypeError(`Authentication error: ${err.message}`);
    }
  },
  build: async (modelDir: string, options: Record<string, any>): Promise<void> => {
    console.log('ali oss uploader start');
    const files = await fs.readdir(modelDir);
    for (let file of files) {
      const filePath = path.join(modelDir, file);
      const f = await fs.stat(filePath);
      if (f.isFile()) {
        console.log('upload file:', filePath);
        await client.put(path.join(ossUrl.path, file), fs.createReadStream(filePath));
        console.log('done');
      }
    }
    console.log('ali oss uploader finished');
    return;
  }
};
