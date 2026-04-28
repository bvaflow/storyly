import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

type Bubble = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
};

type Panel = {
  id: string;
  image_url: string;
  order_index: number;
  bubbles_json: Bubble[];
};

type Comic = {
  id: string;
  title: string;
};

const styles = StyleSheet.create({
  cover: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    color: "#f4f4f5",
    padding: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  coverEyebrow: {
    fontSize: 10,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: "#a1a1aa",
    marginBottom: 24,
  },
  coverTitle: {
    fontSize: 36,
    color: "#f4f4f5",
    textAlign: "center",
  },
  coverFooter: {
    position: "absolute",
    bottom: 48,
    fontSize: 9,
    color: "#71717a",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  panelPage: {
    backgroundColor: "#000",
    padding: 0,
  },
  panelContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  panelImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  bubble: {
    position: "absolute",
    backgroundColor: "white",
    borderRadius: 999,
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#0a0a0a",
  },
  bubbleText: {
    fontSize: 9,
    textAlign: "center",
    color: "#0a0a0a",
  },
});

export function ComicPDF({
  comic,
  panels,
}: {
  comic: Comic;
  panels: Panel[];
}) {
  const sorted = [...panels].sort((a, b) => a.order_index - b.order_index);

  return (
    <Document title={comic.title}>
      <Page size="A4" style={styles.cover}>
        <Text style={styles.coverEyebrow}>strory.fun</Text>
        <Text style={styles.coverTitle}>{comic.title}</Text>
        <Text style={styles.coverFooter}>une bande dessinée personnalisée</Text>
      </Page>

      {sorted.map((panel) => (
        <Page key={panel.id} size="A4" style={styles.panelPage}>
          <View style={styles.panelContainer}>
            <Image src={panel.image_url} style={styles.panelImage} />
            {panel.bubbles_json.map((b) => (
              <View
                key={b.id}
                style={[
                  styles.bubble,
                  {
                    left: `${b.x * 100}%`,
                    top: `${b.y * 100}%`,
                    width: `${b.width * 100}%`,
                    height: `${b.height * 100}%`,
                  },
                ]}
              >
                <Text style={styles.bubbleText}>{b.text}</Text>
              </View>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  );
}
