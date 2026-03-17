import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

// フォント登録（日本語対応のためNotoSansを使用）
// 本番環境では適切なフォントファイルを用意してください

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 20,
    fontFamily: 'Helvetica',
  },
  // 表紙
  coverPage: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  coverSubtitle: {
    fontSize: 16,
    marginBottom: 10,
    color: '#555',
  },
  coverInfo: {
    fontSize: 12,
    marginTop: 5,
    color: '#333',
  },
  // ヘッダー
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottom: '1 solid #ddd',
  },
  headerTitle: {
    fontSize: 10,
    color: '#666',
  },
  headerProject: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  // 写真ペア（1ページ2枚）
  photoPair: {
    flexDirection: 'column',
    gap: 15,
  },
  photoBlock: {
    flexDirection: 'column',
    border: '1 solid #ccc',
    padding: 8,
  },
  photoImage: {
    width: '100%',
    height: 200,
    objectFit: 'contain',
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  photoMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  photoMetaLabel: {
    fontSize: 9,
    color: '#666',
    width: 50,
  },
  photoMetaValue: {
    fontSize: 9,
    color: '#333',
    flex: 1,
  },
  photoDescription: {
    fontSize: 10,
    color: '#333',
    marginTop: 4,
    lineHeight: 1.4,
  },
  // フッター
  pageFooter: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#999',
  },
})

interface Photo {
  id: string
  storage_path: string
  public_url: string
  taken_at: string | null
  description: string | null
  construction_type?: { name: string } | null
  construction_part?: { name: string } | null
}

interface Project {
  id: string
  name: string
  code: string | null
  address: string | null
  start_date: string | null
  end_date: string | null
}

interface Props {
  project: Project
  photos: Photo[]
  organizationName: string
}

export function LedgerDocument({ project, photos, organizationName }: Props) {
  // 写真を2枚ずつのペアに分割
  const photoPairs: Photo[][] = []
  for (let i = 0; i < photos.length; i += 2) {
    photoPairs.push(photos.slice(i, i + 2))
  }

  const generatedDate = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <Document>
      {/* 表紙 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.coverTitle}>工事写真台帳</Text>
          <Text style={styles.coverSubtitle}>{project.name}</Text>
          {project.code && <Text style={styles.coverInfo}>工事番号: {project.code}</Text>}
          {project.address && <Text style={styles.coverInfo}>工事場所: {project.address}</Text>}
          {(project.start_date || project.end_date) && (
            <Text style={styles.coverInfo}>
              工期: {project.start_date ?? ''} 〜 {project.end_date ?? ''}
            </Text>
          )}
          <Text style={[styles.coverInfo, { marginTop: 20 }]}>
            {organizationName}
          </Text>
          <Text style={styles.coverInfo}>作成日: {generatedDate}</Text>
          <Text style={[styles.coverInfo, { marginTop: 10, color: '#888' }]}>
            写真枚数: {photos.length}枚
          </Text>
        </View>
      </Page>

      {/* 写真ページ（2枚/ページ） */}
      {photoPairs.map((pair, pageIdx) => (
        <Page key={pageIdx} size="A4" style={styles.page}>
          {/* ページヘッダー */}
          <View style={styles.pageHeader}>
            <Text style={styles.headerProject}>{project.name}</Text>
            <Text style={styles.headerTitle}>工事写真台帳</Text>
          </View>

          <View style={styles.photoPair}>
            {pair.map((photo, idx) => (
              <View key={photo.id} style={styles.photoBlock}>
                {/* 写真画像 */}
                <Image
                  src={photo.public_url}
                  style={styles.photoImage}
                />

                {/* メタデータ */}
                <View style={styles.photoMeta}>
                  <Text style={styles.photoMetaLabel}>工種:</Text>
                  <Text style={styles.photoMetaValue}>
                    {photo.construction_type?.name ?? '未設定'}
                  </Text>
                  <Text style={styles.photoMetaLabel}>部位:</Text>
                  <Text style={styles.photoMetaValue}>
                    {photo.construction_part?.name ?? '未設定'}
                  </Text>
                </View>
                {photo.taken_at && (
                  <View style={styles.photoMeta}>
                    <Text style={styles.photoMetaLabel}>撮影日:</Text>
                    <Text style={styles.photoMetaValue}>
                      {new Date(photo.taken_at).toLocaleDateString('ja-JP')}
                    </Text>
                  </View>
                )}
                {photo.description && (
                  <Text style={styles.photoDescription}>{photo.description}</Text>
                )}
              </View>
            ))}
          </View>

          {/* ページフッター */}
          <View style={styles.pageFooter}>
            <Text>{organizationName}</Text>
            <Text>{pageIdx + 1}</Text>
          </View>
        </Page>
      ))}
    </Document>
  )
}
