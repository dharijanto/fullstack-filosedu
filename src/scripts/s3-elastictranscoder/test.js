/*
 * Copyright 2013. Amazon Web Services, Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
**/

// Load the SDK and UUID
var AWS = require('aws-sdk')
var fs = require('fs')

AWS.config.update({region: 'ap-southeast-1'})

const name = '601_Arti_Pecahan.mp4'

fs.readFile('601_Arti_Pecahan.mp4', function (err, data) {
  if (err) {
    throw err
  }

  var base64data = Buffer.from(data, 'binary')
  var s3 = new AWS.S3()

  var params = {
    Bucket: 'ncloud-testing',
    Key: name,
    Body: base64data,
    ACL: 'public-read'
  }

  s3.putObject(params, function (err, data) {
    if (err) {
      console.log(err)
    } else {
      console.log(data)
      var elastictranscoder = new AWS.ElasticTranscoder()
      var paramElastic = {
        PipelineId: '1517283530132-1wj56s', /* required */
        Input: {
          Key: name
        },
      // OutputKeyPrefix mean folder tujuan
        OutputKeyPrefix: 'videos_v1/',
        Outputs: [
          {
            Key: '360p-' + name,
            PresetId: '1517305976374-exb5fa'
          },
          {
            Key: '720p-' + name,
            PresetId: '1351620000001-000010'
          }
        ]
      }

      elastictranscoder.createJob(paramElastic, function (err, data) {
        if (err) {
          console.log(err, err.stack) // an error occurred
        } else {
          console.log(data)
        }
      })
    }
  })
})
