import React, { useState, useEffect, useCallback } from 'react'
import styled from '@emotion/styled'
import { useDispatch, useSelector } from 'react-redux'
import useLocalStorageState from 'use-local-storage-state'
import history from '../history'
import gql from 'graphql-tag'

import { useQuery } from '@apollo/client'

import ZoomableImage from './ZoomableImage'
import PhotoMetadata from './PhotoMetadata'
import { getSafeArea } from '../stores/layout/selector'
import { getPrevNextPhotos } from '../stores/photos/selector'

import { ReactComponent as DownloadIcon } from '../static/images/download_arrow.svg'
import { ReactComponent as ArrowBackIcon } from '../static/images/arrow_back.svg'
import { ReactComponent as ArrowLeftIcon } from '../static/images/arrow_left.svg'
import { ReactComponent as ArrowRightIcon } from '../static/images/arrow_right.svg'
import { ReactComponent as InfoIcon } from '../static/images/info.svg'
import { ReactComponent as CloseIcon } from '../static/images/close.svg'

import photos from '../stores/photos/index'

// const I_KEY = 73
const LEFT_KEY = 37
const RIGHT_KEY = 39
const BEFORE = 'before'
const AFTER = 'after'

const GET_PHOTOS = gql`
  query Photos(
    $filters: String
    $after: String
    $first: Int
    $last: Int
    $before: String
    $id: UUID
  ) {
    allPhotos(
      multiFilter: $filters
      first: $first
      after: $after
      before: $before
      last: $last
      id: $id
    ) {
      pageInfo {
        endCursor
        hasNextPage
        hasPreviousPage
      }
      edges {
        cursor
        node {
          id
          location
          starRating
        }
      }
    }
  }
`

const Container = styled('div')`
  width: 100vw;
  height: 100vh;
  background-color: #1b1b1b;

  .content {
    width: 110vw;
    height: 100vh;
    overflow: auto;
    position: fixed;
    z-index: 10;
    top: 0;
    left: 0;
  }

  .backIcon {
    position: absolute;
    top: 10px;
    left: 10px;
    cursor: pointer;
    z-index: 10;
    svg {
      filter: invert(0.9);
    }
  }
  .prevNextIcons {
    position: absolute;
    top: 0;
    width: 100%;
    display: flex;
    justify-content: space-between;
    opacity: 0;
    transition: opacity 250ms;
    svg {
      filter: invert(0.9);
      cursor: pointer;
      padding: 10vh 10px;
      width: 48px;
      height: 25vh;
      position: absolute;
      top: 37.5vh;
      &.prevArrow {
        left: 0;
      }
      &.nextArrow {
        right: 0;
      }
    }
  }
  .showDetailIcon {
    position: absolute;
    right: 10px;
    top: 10px;
    filter: invert(0.9);
    cursor: pointer;
    z-index: 10;
  }
  .showDownloadIcon {
    position: absolute;
    right: 50px;
    top: 10px;
    filter: invert(0.9);
    cursor: pointer;
    z-index: 10;
  }

  /* When two boxes can no longer fit next to each other */
  @media all and (max-width: 500px) {
    .metadata .boxes .box {
      width: 100%;
    }
    .metadata .boxes .histogram {
      margin-right: 40px;
    }
    .metadata .boxes .map {
      margin-right: 40px;
    }
  }
`

const PhotoDetail = ({ photoId, photo, refetch, updatePhotoFile }) => {
  const dispatch = useDispatch()
  const safeArea = useSelector(getSafeArea)
  const [showBoundingBox, setShowBoundingBox] = useLocalStorageState(
    'showObjectBoxes',
    true
  )
  const [showMetadata, setShowMetadata] = useState(false)
  const [showPrevNext, setShowPrevNext] = useState(false)
  const prevNextPhotos = useSelector((state) =>
    getPrevNextPhotos(state, photoId)
  )

  const [fetchNextPrevious, setFetchNextPrevious] = useState(false)
  const [firstPrevious, setFirstPrevious] = useLocalStorageState(
    'firstPrevious',
    0
  )

  const timelinePhotoIds = useSelector(photos)
  const [showTopIcons, setShowTopIcons] = useState(true)

  // TODO: Bring this back so it doesn't get triggered by someone adding a tag with 'i' in it
  // useEffect(() => {
  //   const handleKeyDown = (event) => {
  //     switch (event.keyCode) {
  //       case I_KEY:
  //         setShowMetadata(!showMetadata)
  //         break
  //       default:
  //         break
  //     }
  //   }

  //   document.addEventListener('keydown', handleKeyDown)

  //   return () => {
  //     document.removeEventListener('keydown', handleKeyDown)
  //   }
  // }, [showMetadata])

  const { data: photosData, fetchMore: fetchMorePhotos } = useQuery(
    GET_PHOTOS,
    {
      variables: {
        filters: '',
        id: photoId,
        first: 1,
        last: null,
        after: '',
      },
    },
    {
      skip: true,
    }
  )

  const updatePhotosStore = useCallback(
    (data) => {
      dispatch({
        type: 'SET_PHOTOS',
        payload: data,
      })
    },
    [dispatch]
  )

  // Fetch next/previous photo
  const fetchNextPreviousPhoto = useCallback(
    async (val) => {
      const { endCursor } = photosData.allPhotos.pageInfo
      let photo_variables = {}
      const timelinePhoto = timelinePhotoIds.photos.photosDetail.find(
        (item) => item.node.id === photoId
      )
      if (val === AFTER)
        photo_variables = { after: timelinePhoto.cursor, id: null }
      else if (val === BEFORE) {
        photo_variables = {
          before: firstPrevious >= 1 ? endCursor : null,
          id: null,
          first: null,
          last: 1,
        }
        if (firstPrevious < 1) setFirstPrevious(firstPrevious + 1)
      }
      await fetchMorePhotos({
        variables: photo_variables,
        updateQuery: (prevResult, { fetchMoreResult }) => {
          fetchMoreResult.allPhotos.edges = [
            ...prevResult.allPhotos.edges,
            ...fetchMoreResult.allPhotos.edges,
          ]
          setFetchNextPrevious(
            fetchMoreResult.allPhotos.edges[
              fetchMoreResult.allPhotos.edges.length - 1
            ]
          )
          if (val !== BEFORE)
            updatePhotosStore({
              ids: [
                fetchMoreResult.allPhotos.edges[
                  fetchMoreResult.allPhotos.edges.length - 1
                ].node.id,
              ],
              photoList: [
                fetchMoreResult.allPhotos.edges[
                  fetchMoreResult.allPhotos.edges.length - 1
                ],
              ],
            })
          return fetchMoreResult
        },
      })
    },
    [
      fetchMorePhotos,
      firstPrevious,
      photoId,
      photosData,
      setFirstPrevious,
      timelinePhotoIds,
      updatePhotosStore,
    ]
  )

  // To show next/previous photos.
  useEffect(() => {
    if (fetchNextPrevious) {
      history.replace(`/photo/${fetchNextPrevious.node.id}`)
    }
  }, [fetchNextPrevious])

  const prevPhoto = useCallback(() => {
    let id = prevNextPhotos.prev[0]
    if (id) {
      history.replace(`/photo/${id}`)
    } else fetchNextPreviousPhoto(BEFORE)
  }, [prevNextPhotos, fetchNextPreviousPhoto])

  const nextPhoto = useCallback(() => {
    let id = prevNextPhotos.next[0]
    if (id) {
      history.replace(`/photo/${id}`)
    } else fetchNextPreviousPhoto(AFTER)
  }, [prevNextPhotos, fetchNextPreviousPhoto])

  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.keyCode) {
        case LEFT_KEY:
          prevPhoto()
          break
        case RIGHT_KEY:
          nextPhoto()
          break
        default:
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [photoId, prevNextPhotos, prevPhoto, nextPhoto])

  const setBoxColorClass = (tag) => {
    return tag.deleted ? 'whiteBox' : tag.verified ? 'greenBox' : 'yellowBox'
  }

  let boxes = {
    object: photo?.objectTags.map((objectTag) => {
      return {
        name: objectTag.tag.name,
        positionX: objectTag.positionX,
        positionY: objectTag.positionY,
        sizeX: objectTag.sizeX,
        sizeY: objectTag.sizeY,
      }
    }),
    face: photo?.personTags.map((tag) => {
      return {
        id: tag.id,
        name: tag.tag.name,
        positionX: tag.positionX,
        positionY: tag.positionY,
        sizeX: tag.sizeX,
        sizeY: tag.sizeY,
        verified: tag.verified,
        deleted: tag.deleted,
        boxColorClass: setBoxColorClass(tag),
        showVerifyIcon: tag.showVerifyIcon,
      }
    }),
  }

  return (
    <Container>
      <ZoomableImage
        photoId={photoId}
        boxes={showBoundingBox && boxes}
        showBoundingBox={showBoundingBox}
        setShowBoundingBox={setShowBoundingBox}
        showMetadata={showMetadata}
        setShowMetadata={setShowMetadata}
        showTopIcons={showTopIcons}
        setShowTopIcons={setShowTopIcons}
        next={nextPhoto}
        prev={prevPhoto}
        refetch={refetch}
      />
      {showTopIcons && (
        <div
          className="backIcon"
          title="Press [Esc] key to go back to photo list"
          style={{ marginTop: safeArea.top }}
        >
          <ArrowBackIcon
            alt="Close"
            onClick={() => {
              if (document.referrer !== '' || history.length > 2) {
                history.goBack()
              } else {
                history.push('/')
              }
            }}
          />
        </div>
      )}
      <div className="prevNextIcons" style={{ opacity: showPrevNext ? 1 : 0 }}>
        <ArrowLeftIcon
          alt="Previous"
          className="prevArrow"
          onClick={prevPhoto}
          onMouseOver={() => setShowPrevNext(true)}
          onMouseOut={() => setShowPrevNext(false)}
          title="Use [←] left/right [→] arrow keys to quickly go to the previous/next photo"
        />
        <ArrowRightIcon
          alt="Previous"
          className="nextArrow"
          onClick={nextPhoto}
          onMouseOver={() => setShowPrevNext(true)}
          onMouseOut={() => setShowPrevNext(false)}
          title="Use [←] left/right [→] arrow keys to quickly go to the previous/next photo"
        />
      </div>
      {photo && (
        <PhotoMetadata
          photo={photo}
          show={showMetadata}
          refetch={refetch}
          showBoundingBox={showBoundingBox}
          setShowBoundingBox={setShowBoundingBox}
          updatePhotoFile={updatePhotoFile}
        />
      )}

      {showTopIcons &&
        (!showMetadata ? (
          <InfoIcon
            className="showDetailIcon"
            height="30"
            width="30"
            onClick={() => setShowMetadata(!showMetadata)}
            style={{ marginTop: safeArea.top }}
            // title="Press [I] key to show/hide photo details"
          />
        ) : (
          <CloseIcon
            className="showDetailIcon"
            height="30"
            width="30"
            onClick={() => setShowMetadata(!showMetadata)}
            style={{ marginTop: safeArea.top }}
            // title="Press [I] key to show/hide photo details"
          />
        ))}
      {showTopIcons && photo?.downloadUrl && (
        <a href={`${photo.downloadUrl}`} download>
          <DownloadIcon
            className="showDownloadIcon"
            height="30"
            width="30"
            style={{ marginTop: safeArea.top, padding: 3 }}
          />
        </a>
      )}
    </Container>
  )
}

export default PhotoDetail
